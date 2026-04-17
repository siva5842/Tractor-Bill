import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ visible, title, message, onConfirm, onCancel }: Props) {
  const { t } = useApp();
  const colors = useColors();

  const handleConfirm = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "18" }]}>
            <MaterialIcons name="warning" size={36} color={colors.destructive} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, { borderColor: colors.border, borderWidth: 1.5 }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>{t("cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.destructive }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.btnText, { color: colors.destructiveForeground }]}>
                {t("deleteConfirm")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 28,
    alignItems: "center",
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
