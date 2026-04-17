import { MaterialIcons } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileModal } from "@/components/ProfileModal";
import { TopAppBar } from "@/components/TopAppBar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function MyQrTab() {
  const { t, myQrUri, setMyQrUri } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showProfile, setShowProfile] = useState(false);
  const prevBrightness = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (myQrUri && Platform.OS !== "web") {
        (async () => {
          try {
            const { status } = await Brightness.requestPermissionsAsync();
            if (status === "granted" && mounted) {
              const cur = await Brightness.getBrightnessAsync();
              prevBrightness.current = cur;
              await Brightness.setBrightnessAsync(1.0);
            }
          } catch {}
        })();
      }
      return () => {
        mounted = false;
        if (prevBrightness.current !== null && Platform.OS !== "web") {
          Brightness.setBrightnessAsync(prevBrightness.current).catch(() => {});
          prevBrightness.current = null;
        }
      };
    }, [myQrUri])
  );

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("galleryPermission"), t("galleryPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyQrUri(result.assets[0].uri);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("cameraPermission"), t("cameraPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyQrUri(result.assets[0].uri);
    }
  };

  const handleRemove = () => {
    Alert.alert(t("removeQR"), t("removeQRConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: () => setMyQrUri(null),
      },
    ]);
  };

  const showOptions = () => {
    Alert.alert(t("uploadQR"), "", [
      { text: t("camera"), onPress: handleCamera },
      { text: t("gallery"), onPress: handleUpload },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const bottomPad = Platform.OS === "web" ? 100 : insets.bottom + 80;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TopAppBar onProfilePress={() => setShowProfile(true)} />

      <View style={[styles.content, { paddingBottom: bottomPad }]}>
        {myQrUri ? (
          <>
            <View style={[styles.qrCard, { backgroundColor: "#FFFFFF", borderRadius: 20 }]}>
              <Image
                source={{ uri: myQrUri }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.readyText, { color: colors.mutedForeground }]}>
              {t("qrReady")}
            </Text>
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.changeBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
                onPress={showOptions}
              >
                <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
                <Text style={[styles.changeBtnText, { color: colors.primary }]}>{t("changeQR")}</Text>
              </Pressable>
              <Pressable
                style={[styles.removeBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
                onPress={handleRemove}
              >
                <MaterialIcons name="delete-outline" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.secondary, borderRadius: 48 },
              ]}
            >
              <MaterialIcons name="qr-code-2" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("myQrTitle")}</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {t("myQrDesc")}
            </Text>
            <Pressable
              style={[styles.uploadBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={showOptions}
            >
              <MaterialIcons name="upload" size={22} color={colors.primaryForeground} />
              <Text style={[styles.uploadBtnText, { color: colors.primaryForeground }]}>
                {t("uploadQR")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  qrCard: {
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    width: "100%",
    maxWidth: 340,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  readyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
  },
  changeBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  removeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  emptyState: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  uploadBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
