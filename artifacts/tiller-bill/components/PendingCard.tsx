import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useApp } from "@/context/AppContext";
import { PendingDebt } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  debt: PendingDebt;
  onDelete: () => void;
  onPaid: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function PendingCard({ debt, onDelete, onPaid }: Props) {
  const { t, confirmationSettings } = useApp();
  const colors = useColors();

  const handleCall = () => {
    if (debt.mobileNumber) {
      Linking.openURL(`tel:${debt.mobileNumber}`);
    }
  };

  const handleWhatsApp = () => {
    if (debt.mobileNumber) {
      const msgTemplate = t("whatsappMsg");
      const msg = msgTemplate
        .replace("{name}", debt.contactName)
        .replace("{amount}", debt.amount.toFixed(2));
      Linking.openURL(`https://wa.me/91${debt.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`);
    }
  };

  const handlePaidPress = () => {
    if (confirmationSettings.confirmMarkAsPaid) {
      Alert.alert(
        t("confirmMarkAsPaidTitle"),
        t("confirmMarkAsPaidMsg"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("paid"), style: "default", onPress: onPaid },
        ]
      );
    } else {
      onPaid();
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {debt.contactName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{debt.contactName}</Text>
          {!!debt.mobileNumber && (
            <Text style={[styles.mobile, { color: colors.mutedForeground }]}>
              {debt.mobileNumber}
            </Text>
          )}
          {!!debt.equipmentName && (
            <Text style={[styles.equip, { color: colors.mutedForeground }]}>
              {debt.equipmentName}
            </Text>
          )}
          {!!debt.reminderDate && (
            <View style={styles.reminderRow}>
              <MaterialIcons name="alarm" size={12} color={colors.accent} />
              <Text style={[styles.reminderText, { color: colors.accent }]}>
                {formatDate(debt.reminderDate)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.primary }]}>₹{debt.amount.toFixed(0)}</Text>
          <Pressable onPress={onDelete} hitSlop={8}>
            <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {!!debt.mobileNumber && (
          <>
            <Pressable style={styles.actionBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>{t("callCustomer")}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.actionBtn} onPress={handleWhatsApp}>
              <MaterialIcons name="chat" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>{t("whatsapp")}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}
        <Pressable style={styles.actionBtn} onPress={handlePaidPress}>
          <MaterialIcons name="check-circle" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>{t("paid")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  mobile: {
    fontSize: 13,
  },
  equip: {
    fontSize: 12,
    fontStyle: "italic",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  reminderText: {
    fontSize: 12,
    fontWeight: "600",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    width: 1,
  },
});
