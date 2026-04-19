import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useApp } from "@/context/AppContext";
import { PendingDebt, useData } from "@/context/DataContext";
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
  const { deletePendingItem, markPendingItemPaid, updatePendingItem, markPendingPaid } = useData();
  const [expanded, setExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");

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
        .replace("{amount}", debt.totalAmount.toFixed(2));
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

  const startEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditAmount(item.amount.toString());
    setEditDesc(item.description);
  };

  const saveEdit = (itemId: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(t("error"), t("enterValidAmount"));
      return;
    }
    updatePendingItem(debt.id, itemId, { amount: amt, description: editDesc });
    setEditingItemId(null);
  };

  const handleItemPaid = (itemId: string) => {
    if (confirmationSettings.confirmMarkAsPaid) {
      Alert.alert(
        t("confirmMarkAsPaidTitle"),
        t("confirmMarkAsPaidMsg"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("paid"), style: "default", onPress: () => markPendingItemPaid(debt.id, itemId) },
        ]
      );
    } else {
      markPendingItemPaid(debt.id, itemId);
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
      <Pressable style={styles.top} onPress={() => setExpanded(!expanded)}>
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
          <View style={styles.itemCountRow}>
            <MaterialIcons name="list" size={14} color={colors.mutedForeground} />
            <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
              {debt.lineItems.length} {debt.lineItems.length === 1 ? t("item") || "item" : t("items") || "items"}
            </Text>
          </View>
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
          <Text style={[styles.amount, { color: colors.primary }]}>₹{debt.totalAmount.toFixed(0)}</Text>
          <MaterialIcons 
            name={expanded ? "expand-less" : "expand-more"} 
            size={24} 
            color={colors.mutedForeground} 
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.ledger, { borderTopColor: colors.border }]}>
          {debt.lineItems.map((item) => (
            <View key={item.id} style={[styles.ledgerItem, { borderBottomColor: colors.border }]}>
              {editingItemId === item.id ? (
                <View style={styles.editBox}>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder={t("description") || "Description"}
                  />
                  <View style={styles.editRow}>
                    <TextInput
                      style={[styles.editInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="numeric"
                      placeholder={t("amount") || "Amount"}
                    />
                    <Pressable onPress={() => saveEdit(item.id)} style={styles.editActionBtn}>
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => setEditingItemId(null)} style={styles.editActionBtn}>
                      <MaterialIcons name="close" size={20} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemDesc, { color: colors.foreground }]}>{item.description}</Text>
                    <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{formatDate(item.timestamp)}</Text>
                  </View>
                  <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{item.amount.toFixed(2)}</Text>
                  <View style={styles.itemActions}>
                    <Pressable onPress={() => startEdit(item)} hitSlop={6}>
                      <MaterialIcons name="edit" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => handleItemPaid(item.id)} hitSlop={6}>
                      <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => deletePendingItem(debt.id, item.id)} hitSlop={6}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}
          <Pressable 
            style={[styles.payAllBtn, { backgroundColor: colors.primary }]} 
            onPress={handlePaidPress}
          >
            <MaterialIcons name="done-all" size={20} color={colors.primaryForeground} />
            <Text style={[styles.payAllText, { color: colors.primaryForeground }]}>
              {t("paid") || "Mark All as Paid"} (₹{debt.totalAmount.toFixed(2)})
            </Text>
          </Pressable>
        </View>
      )}

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
        <Pressable style={styles.actionBtn} onPress={onDelete}>
          <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
          <Text style={[styles.actionText, { color: colors.destructive }]}>{t("delete")}</Text>
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
  itemCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemCount: {
    fontSize: 12,
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
    gap: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
  },
  ledger: {
    borderTopWidth: 1,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  ledgerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemDesc: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemDate: {
    fontSize: 11,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemActions: {
    flexDirection: "row",
    gap: 12,
  },
  editBox: {
    flex: 1,
    gap: 6,
  },
  editRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
  },
  editActionBtn: {
    padding: 4,
  },
  payAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  payAllText: {
    fontSize: 14,
    fontWeight: "700",
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
