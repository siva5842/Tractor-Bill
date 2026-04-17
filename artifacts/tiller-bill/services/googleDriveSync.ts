import AsyncStorage from "@react-native-async-storage/async-storage";

const DRIVE_BACKUP_FILENAME = "tiller_bill_backup.json";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

const STORAGE_KEYS = [
  "@tiller_language",
  "@tiller_profile",
  "@tiller_myqr",
  "@tiller_equipment",
  "@tiller_pending",
  "@tiller_timers",
];

export interface SyncResult {
  success: boolean;
  message: string;
}

export async function backupToDrive(accessToken: string): Promise<SyncResult> {
  try {
    const data: Record<string, string | null> = {};
    for (const key of STORAGE_KEYS) {
      data[key] = await AsyncStorage.getItem(key);
    }

    const payload = JSON.stringify({
      version: 1,
      timestamp: new Date().toISOString(),
      data,
    });

    const existingFileId = await findBackupFileId(accessToken);

    if (existingFileId) {
      const res = await fetch(`${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: payload,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Drive update failed: ${err}`);
      }
    } else {
      const metadata = {
        name: DRIVE_BACKUP_FILENAME,
        parents: ["appDataFolder"],
        mimeType: "application/json",
      };

      const boundary = "tiller_multipart_boundary";
      const multipartBody =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        payload +
        `\r\n--${boundary}--`;

      const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Drive upload failed: ${err}`);
      }
    }

    return { success: true, message: "syncSuccess" };
  } catch (e) {
    console.error("backupToDrive error:", e);
    return { success: false, message: "syncError" };
  }
}

export async function restoreFromDrive(accessToken: string): Promise<SyncResult> {
  try {
    const fileId = await findBackupFileId(accessToken);
    if (!fileId) {
      return { success: false, message: "noBackupFound" };
    }

    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Drive fetch failed: ${await res.text()}`);
    }

    const backup = await res.json();
    if (!backup?.data) throw new Error("Invalid backup format");

    for (const [key, value] of Object.entries(backup.data)) {
      if (value !== null && value !== undefined) {
        await AsyncStorage.setItem(key, value as string);
      } else {
        await AsyncStorage.removeItem(key);
      }
    }

    return { success: true, message: "restoreSuccess" };
  } catch (e) {
    console.error("restoreFromDrive error:", e);
    return { success: false, message: "syncError" };
  }
}

async function findBackupFileId(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${DRIVE_FILES_URL}?spaces=appDataFolder&fields=files(id,name)&q=name='${DRIVE_BACKUP_FILENAME}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.files?.[0]?.id ?? null;
  } catch {
    return null;
  }
}
