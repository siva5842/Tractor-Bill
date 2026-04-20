import { MaterialIcons } from "@expo/vector-icons";
import * as GoogleSignin from "@react-native-google-signin/google-signin";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { backupToDrive, restoreFromDrive, wipeAppDataFromDrive } from "@/services/googleDriveSync";
import { TranslationKey } from "@/i18n/translations";

const GOOGLE_WEB_CLIENT_ID =
  "234691857286-bktdmjbvs55m10rc4ds78gliid4si6nm.apps.googleusercontent.com";

GoogleSignin.GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  scopes: [
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.file",
  ],
  offlineAccess: true,
});

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
        <Text style={[toggleStyles.label, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[toggleStyles.desc, { color: colors.mutedForeground }]}>
          {description}
        </Text>
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
    t,
    profile,
    updateProfile,
    signIn,
    signOut,
    setHasSeenOnboarding,
    confirmationSettings,
    updateConfirmationSettings,
    timerSettings,
    updateTimerSettings,
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

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.GoogleSignin.signIn({
        prompt: "select_account",
      });
      if (data?.idToken) {
        const tokens = await GoogleSignin.GoogleSignin.getTokens();
        await signIn(tokens.accessToken, data.user.email ?? "", data.user.name ?? profile.name);
        if (data.user.photo) {
          updateProfile({ photoUri: data.user.photo });
        }
        showToast("signedInAs");
      }
    } catch (error: any) {
      console.error("[Google Auth Error]", error);
      if (error.code !== GoogleSignin.statusCodes.SIGN_IN_CANCELLED) {
        showToast("syncError");
      }
    }
  };

  const handleSave = () => {
    updateProfile({
      name: name.trim(),
      upiId: upiId.trim(),
    });
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

  const handleWipeCloudData = async () => {
    if (!profile.googleAccessToken) return;
    
    const doWipe = async () => {
      setIsSyncing(true);
      const result = await wipeAppDataFromDrive(profile.googleAccessToken!);
      setIsSyncing(false);
      showToast(result.message as TranslationKey);
    };

    Alert.alert(
      t("wipeCloudData") || "Delete App Data from Google Drive",
      "This will permanently remove your cloud backup. Local data will remain. Continue?",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete") || "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("confirmWipe") || "Are you absolutely sure?",
              t("confirmWipeDesc") || "This action cannot be undone.",
              [
                { text: t("cancel"), style: "cancel" },
                { text: t("delete") || "Delete", style: "destructive", onPress: doWipe }
              ]
            );
          },
        },
      ]
    );
  };

  const handleReplayGuide = async () => {
    await setHasSeenOnboarding(false);
    onClose();
  };

  const showToast = (key: TranslationKey) => {
    setToastMsg(t(key));
    setTimeout(() => setToastMsg(null), 3000);
  };

  const pickProfilePic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        updateProfile({ photoUri: result.assets[0].uri });
      }
    } catch (e) {
      console.error("Document picker error:", e);
    }
  };

  const handleAvatarPress = () => {
    const options = [
      { text: t("chooseFromDevice") || "Choose from Device", onPress: pickProfilePic },
      { text: t("cancel"), style: "cancel" as const },
    ];
    if (profile.isSignedIn) {
      options.unshift({
        text: t("syncFromGoogle") || "Sync from Google",
        onPress: handleGoogleSignIn,
      });
    }
    Alert.alert(t("profilePhoto") || "Profile Photo", "", options);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("settings")}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={26}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {toastMsg && (
            <View style={[styles.toast, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.toastText}>{toastMsg}</Text>
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileHeader}>
              <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
                {profile.photoUri ? (
                  <Image
                    source={{ uri: profile.photoUri }}
                    style={[styles.googleAvatarLarge, { borderRadius: 50 }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.googleAvatarLarge,
                      { backgroundColor: colors.primary, borderRadius: 50 },
                    ]}
                  >
                    <Text style={styles.googleAvatarTextLarge}>
                      {(profile.displayName ??
                        profile.email ??
                        "G")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.editIconBadge,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <MaterialIcons name="edit" size={14} color={colors.primary} />
                </View>
              </Pressable>
            </View>

            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground }]}
            >
              {t("profile").toUpperCase()}
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("userName")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("namePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("upiId")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius,
                },
              ]}
              value={upiId}
              onChangeText={setUpiId}
              placeholder={t("upiPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground, marginTop: 8 },
              ]}
            >
              {t("accountSection").toUpperCase()}
            </Text>

            {!profile.isSignedIn ? (
              <Pressable
                style={[
                  styles.googleBtn,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
                onPress={handleGoogleSignIn}
              >
                <View style={styles.googleLogo}>
                  <Text style={styles.googleLogoG}>G</Text>
                </View>
                <Text
                  style={[styles.googleBtnText, { color: colors.foreground }]}
                >
                  {t("signInGoogle")}
                </Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View
                  style={[
                    styles.googleAvatarSmall,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.googleAvatarText}>
                    {(profile.displayName ??
                      profile.email ??
                      "G")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.accountName, { color: colors.foreground }]}
                  >
                    {profile.displayName || profile.name}
                  </Text>
                  <Text
                    style={[
                      styles.accountEmail,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {profile.email}
                  </Text>
                </View>
                <Pressable
                  onPress={signOut}
                  style={styles.signOutBtn}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="logout"
                    size={20}
                    color={colors.destructive}
                  />
                </Pressable>
              </View>
            )}

            {profile.isSignedIn && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground, marginTop: 20 },
                  ]}
                >
                  {t("dataSection").toUpperCase()}
                </Text>
                <Pressable
                  style={[
                    styles.syncBtn,
                    {
                      borderRadius: colors.radius,
                      backgroundColor: colors.primary + "14",
                      borderColor: colors.primary + "55",
                    },
                  ]}
                  onPress={handleSyncToCloud}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialIcons
                      name="cloud-upload"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                  <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                    {isSyncing ? t("syncing") : t("syncToCloud")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.syncBtn,
                    {
                      borderRadius: colors.radius,
                      backgroundColor: colors.accent + "14",
                      borderColor: colors.accent + "55",
                      marginTop: 10,
                    },
                  ]}
                  onPress={handleRestoreFromCloud}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <MaterialIcons
                      name="cloud-download"
                      size={22}
                      color={colors.accent}
                    />
                  )}
                  <Text style={[styles.syncBtnText, { color: colors.accent }]}>
                    {isRestoring ? t("restoring") : t("restoreFromCloud")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.syncBtn,
                    {
                      borderRadius: colors.radius,
                      backgroundColor: colors.destructive + "14",
                      borderColor: colors.destructive + "55",
                      marginTop: 10,
                    },
                  ]}
                  onPress={handleWipeCloudData}
                  disabled={isSyncing}
                >
                  <MaterialIcons
                    name="delete-forever"
                    size={22}
                    color={colors.destructive}
                  />
                  <Text style={[styles.syncBtnText, { color: colors.destructive }]}>
                    {t("wipeCloudData") || "Delete App Data from Google Drive"}
                  </Text>
                </Pressable>
              </>
            )}

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground, marginTop: 20 },
              ]}
            >
              {t("timerSettings").toUpperCase()}
            </Text>
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <ToggleRow
                label={t("allowSimultaneousTimers")}
                description={t("allowSimultaneousTimersDesc")}
                value={timerSettings.allowSimultaneousTimers}
                onToggle={(v) =>
                  updateTimerSettings({ allowSimultaneousTimers: v })
                }
              />
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground, marginTop: 20 },
              ]}
            >
              {t("popupSettings").toUpperCase()}
            </Text>
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <ToggleRow
                label={t("turnOffPopDeletions")}
                description={t("turnOffPopDeletionsDesc")}
                value={!confirmationSettings.confirmDeletions}
                onToggle={(v) =>
                  updateConfirmationSettings({ confirmDeletions: !v })
                }
              />
              <ToggleRow
                label={t("turnOffPopMarkAsPaid")}
                description={t("turnOffPopMarkAsPaidDesc")}
                value={!confirmationSettings.confirmMarkAsPaid}
                onToggle={(v) =>
                  updateConfirmationSettings({ confirmMarkAsPaid: !v })
                }
              />
              <ToggleRow
                label={t("turnOffPopExitTimer")}
                description={t("turnOffPopExitTimerDesc")}
                value={!confirmationSettings.confirmExitTimer}
                onToggle={(v) =>
                  updateConfirmationSettings({ confirmExitTimer: !v })
                }
              />
              <ToggleRow
                label={t("turnOffPopHistoryDelete")}
                description={t("turnOffPopHistoryDeleteDesc")}
                value={!confirmationSettings.confirmHistoryDeletion}
                onToggle={(v) =>
                  updateConfirmationSettings({ confirmHistoryDeletion: !v })
                }
              />
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.mutedForeground, marginTop: 20 },
              ]}
            >
              {t("helpSection").toUpperCase()}
            </Text>
            <Pressable
              style={[
                styles.syncBtn,
                {
                  borderRadius: colors.radius,
                  backgroundColor: colors.primary + "14",
                  borderColor: colors.primary + "55",
                },
              ]}
              onPress={handleReplayGuide}
            >
              <MaterialIcons
                name="help-outline"
                size={22}
                color={colors.primary}
              />
              <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                {t("helpReplayGuide")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  marginTop: 24,
                },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t("save")}
              </Text>
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleLogoG: { fontSize: 14, fontWeight: "800", color: "#4285F4" },
  googleBtnText: { fontSize: 15, fontWeight: "600", flex: 1 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    marginBottom: 4,
  },
  googleAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
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
  profileHeader: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  googleAvatarLarge: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  googleAvatarTextLarge: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
  },
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
