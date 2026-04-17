import { MaterialIcons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { backupToDrive, restoreFromDrive } from "@/services/googleDriveSync";
import { TranslationKey } from "@/i18n/translations";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  "234691857286-gl1mkh6va62n2l8g01o57bktvteude4s.apps.googleusercontent.com";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={[toggleStyles.row, { borderBottomColor: colors.border }]}>
      <View style={toggleStyles.text}>
        <Text style={[toggleStyles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[toggleStyles.desc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#ccc", true: "#81C784" }}
        thumbColor={value ? "#2E7D32" : "#f4f3f4"}
        ios_backgroundColor="#ccc"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 13, fontWeight: "600" },
  desc: { fontSize: 11 },
});

export function ProfileModal({ visible, onClose }: Props) {
  const {
    t, profile, updateProfile, signIn, signOut, setHasSeenOnboarding,
    confirmationSettings, updateConfirmationSettings,
    timerSettings, updateTimerSettings,
  } = useApp();
  const colors = useColors();

  const [name, setName] = useState(profile.name);
  const [upiId, setUpiId] = useState(profile.upiId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.name);
    setUpiId(profile.upiId);
  }, [profile.name, profile.upiId, visible]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/drive.appdata",
    ],
  });

  useEffect(() => {
    if (request?.redirectUri) {
      console.log("[Google Auth] Redirect URI:", request.redirectUri);
    }
  }, [request?.redirectUri]);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      }
    }
  }, [response]);

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await res.json();
      await signIn(accessToken, user.email ?? "", user.name ?? profile.name);
      showToast("signedInAs");
    } catch {
      showToast("syncError");
    }
  };

  const handleSave = () => {
    updateProfile({ name: name.trim() || "Sivaprakasham", upiId: upiId.trim() });
    onClose();
  };

  const handleSyncToCloud = async () => {
    if (!profile.googleAccessToken) return;
    setIsSyncing(true);
    const result = await backupToDrive(profile.googleAccessToken);
    setIsSyncing(false);
    showToast(result.message as TranslationKey);
  };

  const handleRestoreFromCloud = async () => {
    if (!profile.googleAccessToken) return;
    Alert.alert(t("restoreFromCloud"), t("overwriteWarning"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("restoreFromCloud"),
        style: "destructive",
        onPress: async () => {
          setIsRestoring(true);
          const result = await restoreFromDrive(profile.googleAccessToken!);
          setIsRestoring(false);
          showToast(result.message as TranslationKey);
        },
      },
    ]);
  };

  const handleReplayGuide = async () => {
    await setHasSeenOnboarding(false);
    onClose();
  };

  const showToast = (key: TranslationKey) => {
    setToastMsg(t(key));
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t("settings")}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={26} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {toastMsg && (
            <View style={[styles.toast, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.toastText}>{toastMsg}</Text>
            </View>
          )}

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {t("profile").toUpperCase()}
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>{t("userName")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
              value={name}
              onChangeText={setName}
              placeholder={t("namePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>{t("upiId")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
              value={upiId}
              onChangeText={setUpiId}
              placeholder={t("upiPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
              {t("accountSection").toUpperCase()}
            </Text>

            {!profile.isSignedIn ? (
              <Pressable
                style={[styles.googleBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => promptAsync()}
                disabled={!request}
              >
                <View style={styles.googleLogo}>
                  <Text style={styles.googleLogoG}>G</Text>
                </View>
                <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                  {t("signInGoogle")}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.accountCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                <View style={[styles.googleAvatarSmall, { backgroundColor: colors.primary }]}>
                  <Text style={styles.googleAvatarText}>
                    {(profile.displayName ?? profile.email ?? "G")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: colors.foreground }]}>
                    {profile.displayName || profile.name}
                  </Text>
                  <Text style={[styles.accountEmail, { color: colors.mutedForeground }]}>
                    {profile.email}
                  </Text>
                </View>
                <Pressable onPress={signOut} style={styles.signOutBtn} hitSlop={8}>
                  <MaterialIcons name="logout" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            )}

            {profile.isSignedIn && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
                  {t("dataSection").toUpperCase()}
                </Text>
                <Pressable
                  style={[styles.syncBtn, { borderRadius: colors.radius, backgroundColor: colors.primary + "14", borderColor: colors.primary + "55" }]}
                  onPress={handleSyncToCloud}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialIcons name="cloud-upload" size={22} color={colors.primary} />
                  )}
                  <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                    {isSyncing ? t("syncing") : t("syncToCloud")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.syncBtn, { borderRadius: colors.radius, backgroundColor: colors.accent + "14", borderColor: colors.accent + "55", marginTop: 10 }]}
                  onPress={handleRestoreFromCloud}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <MaterialIcons name="cloud-download" size={22} color={colors.accent} />
                  )}
                  <Text style={[styles.syncBtnText, { color: colors.accent }]}>
                    {isRestoring ? t("restoring") : t("restoreFromCloud")}
                  </Text>
                </Pressable>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
              {t("timerSettings").toUpperCase()}
            </Text>
            <View style={[styles.toggleCard, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius }]}>
              <ToggleRow
                label={t("allowSimultaneousTimers")}
                description={t("allowSimultaneousTimersDesc")}
                value={timerSettings.allowSimultaneousTimers}
                onToggle={(v) => updateTimerSettings({ allowSimultaneousTimers: v })}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
              {t("popupSettings").toUpperCase()}
            </Text>
            <View style={[styles.toggleCard, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius }]}>
              <ToggleRow
                label={t("turnOffPopDeletions")}
                description={t("turnOffPopDeletionsDesc")}
                value={!confirmationSettings.confirmDeletions}
                onToggle={(v) => updateConfirmationSettings({ confirmDeletions: !v })}
              />
              <ToggleRow
                label={t("turnOffPopMarkAsPaid")}
                description={t("turnOffPopMarkAsPaidDesc")}
                value={!confirmationSettings.confirmMarkAsPaid}
                onToggle={(v) => updateConfirmationSettings({ confirmMarkAsPaid: !v })}
              />
              <ToggleRow
                label={t("turnOffPopExitTimer")}
                description={t("turnOffPopExitTimerDesc")}
                value={!confirmationSettings.confirmExitTimer}
                onToggle={(v) => updateConfirmationSettings({ confirmExitTimer: !v })}
              />
              <ToggleRow
                label={t("turnOffPopHistoryDelete")}
                description={t("turnOffPopHistoryDeleteDesc")}
                value={!confirmationSettings.confirmHistoryDeletion}
                onToggle={(v) => updateConfirmationSettings({ confirmHistoryDeletion: !v })}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
              {t("helpSection").toUpperCase()}
            </Text>
            <Pressable
              style={[styles.syncBtn, { borderRadius: colors.radius, backgroundColor: colors.primary + "14", borderColor: colors.primary + "55" }]}
              onPress={handleReplayGuide}
            >
              <MaterialIcons name="help-outline" size={22} color={colors.primary} />
              <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                {t("helpReplayGuide")}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 24 }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t("save")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 4,
  },
  googleLogo: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  googleLogoG: { fontSize: 14, fontWeight: "800", color: "#4285F4" },
  googleBtnText: { fontSize: 15, fontWeight: "600", flex: 1 },
  accountCard: {
    flexDirection: "row", alignItems: "center",
    padding: 14, gap: 12, marginBottom: 4,
  },
  googleAvatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  googleAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  accountName: { fontSize: 15, fontWeight: "700" },
  accountEmail: { fontSize: 12, marginTop: 2 },
  signOutBtn: { padding: 6 },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  syncBtnText: { fontSize: 15, fontWeight: "600" },
  toggleCard: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  saveBtn: { paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 17, fontWeight: "700" },
});
