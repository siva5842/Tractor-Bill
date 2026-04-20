import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as Contacts from "expo-contacts";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";

import { AddPendingModal } from "@/components/AddPendingModal";
import { AnalogTimePicker } from "@/components/AnalogTimePicker";
import { ManualCalculatorModal } from "@/components/ManualCalculatorModal";
import { ProfileModal } from "@/components/ProfileModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { TopAppBar } from "@/components/TopAppBar";
import { useApp } from "@/context/AppContext";
import { PendingDebt, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import {
  cancelNotification,
  scheduleDebtReminder,
} from "@/services/notifications";

interface ContactGroup {
  key: string;
  contactName: string;
  mobileNumber: string;
  profilePic?: string;
  debts: PendingDebt[];
  total: number;
}

function groupDebts(debts: PendingDebt[]): ContactGroup[] {
  if (!debts || !Array.isArray(debts)) return [];
  
  return (debts || [])
    .filter(d => !!d) // Safety check for null entries
    .map(d => ({
      key: d.id || String(Math.random()),
      contactName: d.contactName || "Unknown",
      mobileNumber: d.mobileNumber || "",
      profilePic: d.profilePic,
      debts: (d.lineItems || [])
        .filter(li => !!li) // Safety check for null items
        .map(li => ({
          ...li,
          id: li.id || String(Math.random()),
          contactName: d.contactName || "Unknown",
          mobileNumber: d.mobileNumber || "",
          profilePic: d.profilePic,
          amount: li.amount || 0,
          equipmentName: li.description || "",
          createdAt: li.timestamp || Date.now(),
        })),
      total: d.totalAmount || 0,
    }))
    .sort((a, b) => (b.total || 0) - (a.total || 0));
}

function formatDate(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function parseDateStr(dateStr: string): Date | null {
  const cleaned = dateStr.replace(/\s+/g, "").replace(/-/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 8) return null;
  let day: number, month: number, year: number;
  if (digits.length === 6) {
    day = parseInt(digits.slice(0, 2));
    month = parseInt(digits.slice(2, 4));
    year = parseInt("20" + digits.slice(4, 6));
  } else if (digits.length === 7) {
    day = parseInt(digits.slice(0, 1));
    month = parseInt(digits.slice(1, 3));
    year = parseInt("20" + digits.slice(3, 7));
  } else {
    day = parseInt(digits.slice(0, 2));
    month = parseInt(digits.slice(2, 4));
    year = parseInt(digits.slice(4, 8));
  }
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  )
    return null;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

interface ReminderModalProps {
  visible: boolean;
  debt: PendingDebt | null;
  onClose: () => void;
  onSave: (
    debtId: string,
    reminderDate: number,
    notificationId?: string,
  ) => void;
}

function ReminderModal({ visible, debt, onClose, onSave }: ReminderModalProps) {
  const { t } = useApp();
  const colors = useColors();

  const existingDate = debt?.reminderDate ? new Date(debt.reminderDate) : null;

  const [dateStr, setDateStr] = React.useState(() => {
    if (existingDate) {
      const d = String(existingDate.getDate()).padStart(2, "0");
      const m = String(existingDate.getMonth() + 1).padStart(2, "0");
      const y = existingDate.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return "";
  });
  const [hours, setHours] = React.useState(existingDate?.getHours() ?? 9);
  const [minutes, setMinutes] = React.useState(existingDate?.getMinutes() ?? 0);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  React.useEffect(() => {
    if (visible && debt) {
      const ed = debt.reminderDate ? new Date(debt.reminderDate) : null;
      if (ed) {
        const d = String(ed.getDate()).padStart(2, "0");
        const m = String(ed.getMonth() + 1).padStart(2, "0");
        const y = ed.getFullYear();
        setDateStr(`${d}/${m}/${y}`);
        setHours(ed.getHours());
        setMinutes(ed.getMinutes());
      } else {
        setDateStr("");
        setHours(9);
        setMinutes(0);
      }
    }
  }, [visible, debt]);

  const handleSave = async () => {
    if (!dateStr.trim()) {
      Alert.alert(t("missingField"), t("reminderDate2"));
      return;
    }
    const dateObj = parseDateStr(dateStr.trim());
    if (!dateObj) {
      Alert.alert(t("missingField"), t("enterValidDate"));
      return;
    }
    dateObj.setHours(hours, minutes, 0, 0);
    if (dateObj <= new Date()) {
      Alert.alert(t("invalidDate"), t("dateMustBeFuture"));
      return;
    }

    if (debt?.notificationId) {
      await cancelNotification(debt.notificationId);
    }

    const schedId = await scheduleDebtReminder({
      debtId: debt?.id ?? "",
      contactName: debt?.contactName ?? "",
      amount: debt?.amount ?? 0,
      date: dateObj,
      title: t("paymentReminder"),
      body: `${debt?.contactName ?? ""} ${t("owesYou")} ₹${(debt?.amount ?? 0).toFixed(2)}`,
    });

    onSave(debt!.id, dateObj.getTime(), schedId ?? undefined);
    onClose();
  };

  if (!debt) return null;

  const isReschedule = !!debt.reminderDate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={reminderStyles.overlay}
      >
        <View style={[reminderStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={reminderStyles.header}>
            <MaterialIcons name="alarm" size={26} color={colors.primary} />
            <Text style={[reminderStyles.title, { color: colors.foreground }]}>
              {isReschedule ? t("rescheduleReminder") : t("addNewReminder")}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={26}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <View
            style={[
              reminderStyles.infoRow,
              {
                backgroundColor: colors.secondary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialIcons name="person" size={16} color={colors.primary} />
            <Text
              style={[reminderStyles.infoName, { color: colors.foreground }]}
            >
              {debt.contactName}
            </Text>
            <Text
              style={[reminderStyles.infoAmount, { color: colors.primary }]}
            >
              ₹{debt.amount.toFixed(0)}
            </Text>
          </View>

          {isReschedule && (
            <View
              style={[
                reminderStyles.currentRow,
                { borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <MaterialIcons
                name="access-time"
                size={14}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  reminderStyles.currentText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("reminderSetFor")}: {formatDate(debt.reminderDate)}{" "}
                {existingDate
                  ? formatTime12(
                      existingDate.getHours(),
                      existingDate.getMinutes(),
                    )
                  : ""}
              </Text>
            </View>
          )}

          <Text style={[reminderStyles.label, { color: colors.foreground }]}>
            {t("reminderDate")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[
                reminderStyles.input,
                { flex: 1, color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1.5, height: 52, borderRadius: colors.radius, paddingHorizontal: 14 },
              ]}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder={t("datePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            <Pressable
              style={[
                reminderStyles.calendarBtn,
                {
                  backgroundColor: colors.primary + "18",
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons
                name="calendar-month"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <Text style={[reminderStyles.label, { color: colors.foreground }]}>
            {t("reminderTime")}
          </Text>
          <Pressable
            style={[
              reminderStyles.timePickerBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.primary + "12",
                borderRadius: colors.radius,
              },
            ]}
            onPress={() => setShowTimePicker(true)}
          >
            <MaterialIcons
              name="access-time"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[reminderStyles.timePickerText, { color: colors.primary }]}
            >
              {formatTime12(hours, minutes)}
            </Text>
            <MaterialIcons name="edit" size={16} color={colors.primary} />
          </Pressable>

          <Pressable
            style={[
              reminderStyles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            onPress={handleSave}
          >
            <MaterialIcons
              name="alarm-on"
              size={20}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                reminderStyles.saveBtnText,
                { color: colors.primaryForeground },
              ]}
            >
              {isReschedule ? t("rescheduleReminder") : t("addNewReminder")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AnalogTimePicker
        visible={showTimePicker}
        initialHours={hours}
        initialMinutes={minutes}
        onConfirm={(h, m) => {
          setHours(h);
          setMinutes(m);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />

      {showDatePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event: any, selectedDate: any) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const d = String(selectedDate.getDate()).padStart(2, "0");
              const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const y = selectedDate.getFullYear();
              setDateStr(`${d}/${m}/${y}`);
            }
          }}
        />
      )}

      {showDatePicker && Platform.OS === "web" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={reminderStyles.overlay}>
            <View style={[reminderStyles.sheet, { backgroundColor: colors.card, justifyContent: 'center' }]}>
              <Text style={[reminderStyles.label, { color: colors.foreground, marginBottom: 10 }]}>
                Select Date
              </Text>
              <input
                type="date"
                style={{
                  padding: 10,
                  fontSize: 16,
                  borderRadius: 4,
                  border: `1px solid ${colors.border}`,
                  width: "100%",
                  marginBottom: 20,
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const [y, m, d] = val.split("-");
                    setDateStr(`${parseInt(d)}/${parseInt(m)}/${y}`);
                    setShowDatePicker(false);
                  }
                }}
              />
              <Pressable
                style={[reminderStyles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: colors.primaryForeground }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const reminderStyles = StyleSheet.create({
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  infoAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 14,
  },
  currentText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 14,
  },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  timePickerText: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  calendarBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});

interface GroupCardProps {
  group: ContactGroup;
  onDeleteDebt: (id: string) => void;
  onPaidDebt: (id: string) => void;
  onDeleteDebtItem: (debtId: string, itemId: string) => void;
  onPaidDebtItem: (debtId: string, itemId: string) => void;
  onEditCustomer: (debtId: string) => void;
  onEditDebtItem: (debtId: string, item: any) => void;
  onQR: (amount: number) => void;
  onBellPress: (debt: PendingDebt) => void;
}

function GroupCard({
  group,
  onDeleteDebt,
  onPaidDebt,
  onDeleteDebtItem,
  onPaidDebtItem,
  onEditCustomer,
  onEditDebtItem,
  onQR,
  onBellPress,
}: GroupCardProps) {
  const { t, confirmationSettings } = useApp();
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const handleCall = () => {
    if (group.mobileNumber) Linking.openURL(`tel:${group.mobileNumber}`);
  };

  const handleWhatsApp = () => {
    if (group.mobileNumber) {
      const msgTemplate = t("whatsappMsg");
      const msg = msgTemplate
        .replace("{name}", group.contactName)
        .replace("{amount}", group.total.toFixed(2));
      const cleanPhone = group.mobileNumber.replace(/\D/g, "");
      Linking.openURL(
        `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`,
      );
    }
  };

  const handlePaid = (debtId: string) => {
    if (confirmationSettings.confirmMarkAsPaid) {
      Alert.alert(t("confirmMarkAsPaidTitle"), t("confirmMarkAsPaidMsg"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("paid"),
          style: "default",
          onPress: () => onPaidDebt(debtId),
        },
      ]);
    } else {
      onPaidDebt(debtId);
    }
  };

  const handlePaidItem = (debtId: string, itemId: string) => {
    if (confirmationSettings.confirmMarkAsPaid) {
      Alert.alert(t("confirmMarkAsPaidTitle"), t("confirmMarkAsPaidMsg"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("paid"),
          style: "default",
          onPress: () => onPaidDebtItem(debtId, itemId),
        },
      ]);
    } else {
      onPaidDebtItem(debtId, itemId);
    }
  };

  const handleDelete = (debtId: string) => {
    if (confirmationSettings.confirmDeletions) {
      Alert.alert(t("deletePendingTitle"), t("deletePendingMsg"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => onDeleteDebt(debtId),
        },
      ]);
    } else {
      onDeleteDebt(debtId);
    }
  };

  const handleDeleteItem = (debtId: string, itemId: string) => {
    if (confirmationSettings.confirmDeletions) {
      Alert.alert(t("deletePendingTitle"), t("deletePendingMsg"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => onDeleteDebtItem(debtId, itemId),
        },
      ]);
    } else {
      onDeleteDebtItem(debtId, itemId);
    }
  };

  const latestDebt = group.debts[0];

  return (
    <View
      style={[
        styles.groupCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.groupHeader}>
        <View
          style={[styles.avatar, { backgroundColor: (colors.primary || "#000") + "20" }]}
        >
          {typeof group?.profilePic === "string" && group.profilePic !== "" ? (
            <Image
              source={{ uri: group.profilePic }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(group?.contactName || "U").charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={styles.groupInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>
              {group?.contactName || "Unknown"}
            </Text>
            <Pressable
              onPress={() => group?.key && onEditCustomer(group.key)}
              hitSlop={12}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
            </Pressable>
          </View>
          {!!group?.mobileNumber && (
            <Text
              style={[styles.groupPhone, { color: colors.mutedForeground }]}
            >
              {group.mobileNumber}
            </Text>
          )}
          <View style={styles.debtCountRow}>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: (colors.primary || "#000") + "18" },
              ]}
            >
              <Text style={[styles.countText, { color: colors.primary }]}>
                {(group?.debts || []).length} {t("groupDebts")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.groupRight}>
          <Text style={[styles.groupTotal, { color: colors.primary }]}>
            ₹{(group?.total || 0).toFixed(0)}
          </Text>
          <View style={styles.groupRightActions}>
            <Pressable
              style={[
                styles.groupQrBtn,
                {
                  backgroundColor: (colors.primary || "#000") + "18",
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => group?.total && onQR(group.total)}
            >
              <MaterialIcons name="qr-code" size={14} color={colors.primary} />
              <Text style={[styles.groupQrText, { color: colors.primary }]}>
                {t("generateGroupQR")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.groupPaidBtn,
                {
                  backgroundColor: "#2E7D3218",
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => group?.key && handlePaid(group.key)}
            >
              <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
              <Text style={[styles.groupPaidText, { color: "#2E7D32" }]}>
                Pay All
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.bellBtn,
                {
                  backgroundColor: latestDebt?.reminderDate
                    ? (colors.primary || "#000") + "20"
                    : colors.secondary,
                  borderRadius: 8,
                },
              ]}
              onPress={() => latestDebt && onBellPress(latestDebt)}
              hitSlop={8}
            >
              <MaterialIcons
                name={latestDebt?.reminderDate ? "alarm-on" : "add-alarm"}
                size={18}
                color={
                  latestDebt?.reminderDate
                    ? colors.primary
                    : colors.mutedForeground
                }
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.groupActions, { borderTopColor: colors.border }]}>
        {!!group?.mobileNumber && (
          <>
            <Pressable style={styles.actionBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {t("callCustomer")}
              </Text>
            </Pressable>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Pressable style={styles.actionBtn} onPress={handleWhatsApp}>
              <MaterialIcons name="chat" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {t("whatsapp")}
              </Text>
            </Pressable>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </>
        )}
        <Pressable
          style={styles.actionBtn}
          onPress={() => setExpanded((v) => !v)}
        >
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={16}
            color={colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {expanded ? t("collapseGroup") : t("expandGroup")}
          </Text>
        </Pressable>
      </View>

      {expanded && (
        <View
          style={[styles.itemsContainer, { borderTopColor: colors.border }]}
        >
          {(group?.debts || []).map((debt, idx) => (
            <View
              key={debt?.id || String(idx)}
              style={[
                styles.debtItem,
                idx < (group?.debts || []).length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.debtItemLeft}>
                {!!debt?.equipmentName && (
                  <Text
                    style={[styles.debtEquipName, { color: colors.foreground }]}
                  >
                    {debt.equipmentName}
                  </Text>
                )}
                <View style={styles.sourceBadgeRow}>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
                      {debt?.source || "Manual"}
                    </Text>
                  </View>
                </View>
                {!!debt?.reminderDate && (
                  <View style={styles.reminderRow}>
                    <MaterialIcons
                      name="alarm"
                      size={11}
                      color={colors.accent}
                    />
                    <Text
                      style={[styles.reminderText, { color: colors.accent }]}
                    >
                      {formatDate(debt.reminderDate)}
                    </Text>
                  </View>
                )}
                <Text
                  style={[styles.debtDate, { color: colors.mutedForeground }]}
                >
                  {formatDate(debt?.createdAt)}
                </Text>
              </View>

              <View style={styles.debtItemRight}>
                <Text style={[styles.debtAmount, { color: colors.primary }]}>
                  ₹{(debt?.amount || 0).toFixed(0)}
                </Text>
                <View style={styles.debtActions}>
                  <Pressable
                    style={[
                      styles.debtActionBtn,
                      {
                        backgroundColor: colors.secondary,
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => group?.key && debt && onEditDebtItem(group.key, debt)}
                    hitSlop={6}
                  >
                    <MaterialIcons
                      name="edit"
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[styles.debtActionText, { color: colors.mutedForeground }]}
                    >
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.debtActionBtn,
                      {
                        backgroundColor: (colors.primary || "#000") + "18",
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => debt?.amount && onQR(debt.amount)}
                    hitSlop={6}
                  >
                    <MaterialIcons
                      name="qr-code"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.debtActionText, { color: colors.primary }]}
                    >
                      QR
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.debtActionBtn,
                      { backgroundColor: "#2E7D3218", borderRadius: 8 },
                    ]}
                    onPress={() => group?.key && debt?.id && handlePaidItem(group.key, debt.id)}
                    hitSlop={6}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={14}
                      color="#2E7D32"
                    />
                    <Text style={[styles.debtActionText, { color: "#2E7D32" }]}>
                      {t("paid")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => debt && onBellPress(debt)}
                    hitSlop={8}
                    style={[
                      styles.debtActionBtn,
                      {
                        backgroundColor: debt?.reminderDate
                          ? (colors.primary || "#000") + "18"
                          : colors.secondary,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={debt?.reminderDate ? "alarm-on" : "add-alarm"}
                      size={14}
                      color={
                        debt?.reminderDate
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => group?.key && debt?.id && handleDeleteItem(group.key, debt.id)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color={colors.destructive}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PendingTab() {
  const { t } = useApp();
  const colors = useColors();
  const {
    pendingDebts,
    deletePendingDebt,
    markPendingPaid,
    updatePendingDebt,
    deletePendingItem,
    markPendingItemPaid,
    updatePendingItem,
  } = useData();

  const [showAdd, setShowAdd] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPendingAmount, setCalcPendingAmount] = useState<number | null>(null);
  const [qrAmount, setQrAmount] = useState<number | null>(null);
  const [reminderDebt, setReminderDebt] = useState<PendingDebt | null>(null);
  const [editingItem, setEditingItem] = useState<{
    debtId: string;
    item: any;
  } | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<PendingDebt | null>(null);

  const groups = useMemo(() => groupDebts(pendingDebts), [pendingDebts]);
  const totalOwed = useMemo(
    () => pendingDebts.reduce((sum, d) => sum + d.totalAmount, 0),
    [pendingDebts],
  );
  const count = groups.length;

  const handleReminderSave = (
    debtId: string,
    reminderDate: number,
    notificationId?: string,
  ) => {
    updatePendingDebt(debtId, { reminderDate, notificationId });
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TopAppBar
        onProfilePress={() => setShowProfile(true)}
        onCalculatorPress={() => setShowCalculator(true)}
        title={t("pending")}
      />

      {count > 0 && (
        <View style={[styles.totalBanner, { backgroundColor: colors.primary }]}>
          <Text
            style={[
              styles.totalLabel,
              { color: colors.primaryForeground + "CC" },
            ]}
          >
            {t("totalOutstanding")}
          </Text>
          <Text
            style={[styles.totalAmount, { color: colors.primaryForeground }]}
          >
            ₹{totalOwed.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.totalCount,
              { color: colors.primaryForeground + "99" },
            ]}
          >
            {count} {count === 1 ? t("person") : t("people")}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons
              name="assignment-turned-in"
              size={64}
              color={colors.mutedForeground + "44"}
            />
            <Text
              style={[styles.emptyTitle, { color: colors.foreground }]}
            >
              {t("noPending")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {t("noPendingDesc")}
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.key}
              group={g}
              onDeleteDebt={deletePendingDebt}
              onPaidDebt={markPendingPaid}
              onDeleteDebtItem={deletePendingItem}
              onPaidDebtItem={markPendingItemPaid}
              onEditCustomer={(debtId) => {
                const debt = pendingDebts.find(d => d.id === debtId);
                if (debt) setEditingCustomer(debt);
              }}
              onEditDebtItem={(debtId, item) => setEditingItem({ debtId, item })}
              onQR={(amount) => setQrAmount(amount)}
              onBellPress={(debt) => setReminderDebt(debt)}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAdd(true);
        }}
      >
        <MaterialIcons name="add" size={32} color={colors.primaryForeground} />
      </Pressable>

      <AddPendingModal
        visible={showAdd || calcPendingAmount !== null}
        onClose={() => {
          setShowAdd(false);
          setCalcPendingAmount(null);
        }}
        initialAmount={calcPendingAmount?.toString()}
      />

      <ManualCalculatorModal
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSaveToPending={(amount) => {
          setCalcPendingAmount(amount);
          setShowCalculator(false);
        }}
      />

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />

      {qrAmount !== null && (
        <QRCodeModal
          visible={qrAmount !== null}
          amount={qrAmount}
          onClose={() => setQrAmount(null)}
        />
      )}

      <ReminderModal
        visible={!!reminderDebt}
        debt={reminderDebt}
        onClose={() => setReminderDebt(null)}
        onSave={handleReminderSave}
      />

      <EditCustomerModal
        visible={!!editingCustomer}
        debt={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={(updates) => {
          if (editingCustomer) {
            updatePendingDebt(editingCustomer.id, updates);
          }
          setEditingCustomer(null);
        }}
      />

      <EditItemModal
        visible={!!editingItem}
        item={editingItem?.item}
        onClose={() => setEditingItem(null)}
        onSave={(updates) => {
          if (editingItem) {
            updatePendingItem(editingItem.debtId, editingItem.item.id, updates);
          }
          setEditingItem(null);
        }}
      />
    </View>
  );
}

function EditCustomerModal({
  visible,
  debt,
  onClose,
  onSave,
}: {
  visible: boolean;
  debt: PendingDebt | null;
  onClose: () => void;
  onSave: (updates: any) => void;
}) {
  const { t } = useApp();
  const colors = useColors();
  const [contactName, setContactName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (visible && debt) {
      setContactName(debt?.contactName || "");
      setMobileNumber(debt?.mobileNumber || "");
      setProfilePic(debt?.profilePic);
    }
  }, [visible, debt]);

  const pickProfilePic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setProfilePic(String(result.assets[0].uri));
      }
    } catch (e) {
      console.error("Document picker error:", e);
    }
  };

  const pickContact = async () => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("contactsPermission"));
        return;
      }
      const contact = await Contacts.presentContactPickerAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
      });
      if (contact) {
        setContactName(contact.name || "");
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          setMobileNumber(
            contact.phoneNumbers[0].number?.replace(/\s/g, "") || "",
          );
        }
        const photoUri = contact.image?.uri ? String(contact.image.uri) : undefined;
        setProfilePic(photoUri);
      }
    } catch (err) {
      console.error("Error picking contact:", err);
    }
  };

  const handleSave = () => {
    if (!contactName.trim()) {
      Alert.alert(t("missingField"), t("enterContactName"));
      return;
    }
    onSave({
      contactName: contactName.trim(),
      mobileNumber: mobileNumber.trim(),
      profilePic: profilePic,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card || "#fff" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Edit Customer
              </Text>
              <Pressable onPress={onClose}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Pressable onPress={pickProfilePic} style={styles.editAvatar}>
                {typeof profilePic === "string" && profilePic !== "" ? (
                  <Image source={{ uri: profilePic }} style={styles.editAvatarImg} />
                ) : (
                  <View style={[styles.editAvatarPlaceholder, { backgroundColor: colors.secondary || "#eee" }]}>
                    <MaterialIcons name="person" size={40} color={colors.primary} />
                  </View>
                )}
                <View style={[styles.editBadge, { backgroundColor: colors.primary || "#000" }]}>
                  <MaterialIcons name="edit" size={12} color="#fff" />
                </View>
              </Pressable>
            </View>

            <Pressable
              style={[styles.contactPickBtnSmall, { backgroundColor: colors.secondary || "#eee", borderRadius: colors.radius || 8 }]}
              onPress={pickContact}
            >
              <MaterialIcons name="contacts" size={16} color={colors.primary} />
              <Text style={[styles.contactPickTextSmall, { color: colors.primary }]}>
                {t("pickFromContacts")}
              </Text>
            </Pressable>

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("contactName")}
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
              value={contactName}
              onChangeText={setContactName}
              placeholder={t("enterContactName")}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("mobileNumber")}
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
              value={mobileNumber}
              onChangeText={(t) => setMobileNumber(t.replace(/\D/g, ""))}
              placeholder={t("phonePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary || "#000", borderRadius: colors.radius || 8 },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground || "#fff" },
                ]}
              >
                {t("save")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditItemModal({
  visible,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: any;
  onClose: () => void;
  onSave: (updates: any) => void;
}) {
  const { t } = useApp();
  const colors = useColors();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  React.useEffect(() => {
    if (visible && item) {
      setAmount(String(item?.amount || ""));
      setDescription(item?.description || item?.equipmentName || "");
    }
  }, [visible, item]);

  const handleSave = () => {
    const safeAmount = parseFloat(amount);
    if (isNaN(safeAmount) || safeAmount <= 0) {
      Alert.alert(t("missingField"), t("enterValidAmount"));
      return;
    }

    onSave({ amount: safeAmount, description: description || "" });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Edit Item
              </Text>
              <Pressable onPress={onClose}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("amount")}
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
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("notes") || "Description"}
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
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Extra hours"
              placeholderTextColor={colors.mutedForeground}
            />

            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  totalBanner: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "800",
  },
  totalCount: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    paddingVertical: 10,
    paddingBottom: 120,
    gap: 10,
    paddingHorizontal: 16,
  },
  groupCard: {
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  groupHeader: {
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
  groupInfo: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
  },
  groupPhone: {
    fontSize: 13,
  },
  debtCountRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  groupRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  groupTotal: {
    fontSize: 24,
    fontWeight: "800",
  },
  groupRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupQrText: {
    fontSize: 11,
    fontWeight: "700",
  },
  groupPaidBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupPaidText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bellBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  groupActions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    width: 1,
  },
  itemsContainer: {
    borderTopWidth: 1,
  },
  debtItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  debtItemLeft: {
    flex: 1,
    gap: 3,
  },
  debtEquipName: {
    fontSize: 14,
    fontWeight: "600",
  },
  debtDate: {
    fontSize: 11,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reminderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  debtItemRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  sourceBadgeRow: {
    flexDirection: "row",
    marginTop: 1,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  webPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  webPickerCard: {
    padding: 20,
    width: "80%",
    maxWidth: 300,
    borderRadius: 12,
  },
  debtActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  debtActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  debtActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 100 : 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalSheet: {
    padding: 24,
    borderRadius: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: "relative",
  },
  editAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  contactPickBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
    marginBottom: 12,
  },
  contactPickTextSmall: {
    fontSize: 13,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
