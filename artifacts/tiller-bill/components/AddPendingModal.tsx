import { MaterialIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
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

import { AnalogTimePicker } from "@/components/AnalogTimePicker";
import { useApp } from "@/context/AppContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { scheduleDebtReminder } from "@/services/notifications";

interface Props {
  visible: boolean;
  onClose: () => void;
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

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function AddPendingModal({ visible, onClose }: Props) {
  const { t } = useApp();
  const colors = useColors();
  const { addPendingDebt, pendingDebts } = useData();

  const [contactName, setContactName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [wantsReminder, setWantsReminder] = useState(false);
  const [reminderDateStr, setReminderDateStr] = useState("");
  const [reminderHours, setReminderHours] = useState(9);
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [allContacts, setAllContacts] = useState<Contacts.Contact[]>([]);

  const uniqueContacts = useMemo(() => {
    const seen = new Map<string, { name: string; phone: string }>();
    pendingDebts.forEach((d) => {
      const key = d.mobileNumber.replace(/\D/g, "");
      if (!seen.has(key) && d.contactName && d.mobileNumber) {
        seen.set(key, { name: d.contactName, phone: d.mobileNumber });
      }
    });
    return Array.from(seen.values());
  }, [pendingDebts]);

  const filteredSuggestions = useMemo(() => {
    if (!contactName.trim()) return [];
    const lower = contactName.trim().toLowerCase();
    return uniqueContacts.filter((c) => c.name.toLowerCase().includes(lower));
  }, [contactName, uniqueContacts]);

  useEffect(() => {
    if (!visible) {
      setContactName("");
      setMobileNumber("");
      setAmount("");
      setWantsReminder(false);
      setReminderDateStr("");
      setReminderHours(9);
      setReminderMinutes(0);
      setShowSuggestions(false);
    }
  }, [visible]);

  const pickContact = async () => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("contactsPermission"));
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      if (data.length > 0) {
        setAllContacts(data);
        setContactSearch("");
        setShowContactPicker(true);
      }
    } catch {}
  };

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return allContacts.slice(0, 50);
    const lower = contactSearch.trim().toLowerCase();
    return allContacts
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(lower);
        const phoneMatch = c.phoneNumbers?.some((p) =>
          p.number?.replace(/\D/g, "").includes(lower),
        );
        return nameMatch || phoneMatch;
      })
      .slice(0, 50);
  }, [contactSearch, allContacts]);

  const handleSave = async () => {
    if (!contactName.trim()) {
      Alert.alert(t("missingField"), t("enterContactName"));
      return;
    }
    if (!mobileNumber.trim()) {
      Alert.alert(t("missingField"), t("enterMobileNumber"));
      return;
    }
    const digits = mobileNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      Alert.alert(t("invalidPhone"), t("invalidPhoneLength"));
      return;
    }
    if (!amount.trim()) {
      Alert.alert(t("missingField"), t("enterValidAmount"));
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(t("missingField"), t("enterValidAmount"));
      return;
    }

    let reminderDate: number | undefined;
    let notificationId: string | undefined;

    if (wantsReminder) {
      if (!reminderDateStr.trim()) {
        Alert.alert(t("missingField"), t("reminderDate2"));
        return;
      }
      const dateObj = parseDateStr(reminderDateStr.trim());
      if (!dateObj) {
        Alert.alert(t("missingField"), t("enterValidDate"));
        return;
      }
      dateObj.setHours(reminderHours, reminderMinutes, 0, 0);
      if (dateObj <= new Date()) {
        Alert.alert(
          "Invalid Time",
          "You cannot set a reminder for a time that has already passed.",
        );
        return;
      }
      reminderDate = dateObj.getTime();
      const schedId = await scheduleDebtReminder({
        debtId: Date.now().toString(),
        contactName: contactName.trim(),
        amount: amt,
        date: dateObj,
        title: t("paymentReminder"),
        body: `${contactName.trim()} ${t("owesYou")} ₹${amt.toFixed(2)}`,
      });
      if (schedId) notificationId = schedId;
    }

    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addPendingDebt({
      contactName: contactName.trim(),
      mobileNumber: mobileNumber.trim(),
      amount: amt,
      reminderDate,
      notificationId,
    });

    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("addPending")}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={26}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={[
                styles.contactPickBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={pickContact}
            >
              <MaterialIcons name="contacts" size={20} color={colors.primary} />
              <Text style={[styles.contactPickText, { color: colors.primary }]}>
                {t("pickFromContacts")}
              </Text>
            </Pressable>

            <Text style={[styles.orText, { color: colors.mutedForeground }]}>
              {t("orEnterManually")}
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("contactName")}
            </Text>
            <View style={{ position: "relative", zIndex: 10 }}>
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
                onChangeText={(text) => {
                  setContactName(text);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={t("contactName")}
                placeholderTextColor={colors.mutedForeground}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {filteredSuggestions.map((c) => (
                    <Pressable
                      key={c.phone}
                      style={[
                        styles.suggestItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => {
                        setContactName(c.name);
                        setMobileNumber(c.phone);
                        setShowSuggestions(false);
                      }}
                    >
                      <MaterialIcons
                        name="person"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.suggestName,
                          { color: colors.foreground },
                        ]}
                      >
                        {c.name}
                      </Text>
                      <Text
                        style={[
                          styles.suggestPhone,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {c.phone}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

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
              onChangeText={setMobileNumber}
              placeholder={t("phonePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

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
              placeholder={t("amountPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />

            <View
              style={[
                styles.reminderToggleRow,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <MaterialIcons
                name="alarm"
                size={20}
                color={wantsReminder ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.reminderToggleLabel,
                  {
                    color: wantsReminder ? colors.primary : colors.foreground,
                  },
                ]}
              >
                {t("setReminderToggle")}
              </Text>
              <Switch
                value={wantsReminder}
                onValueChange={setWantsReminder}
                trackColor={{ false: "#ccc", true: colors.primary + "80" }}
                thumbColor={wantsReminder ? colors.primary : "#f4f3f4"}
                ios_backgroundColor="#ccc"
              />
            </View>

            {wantsReminder && (
              <View
                style={[
                  styles.reminderFields,
                  {
                    backgroundColor: colors.primary + "08",
                    borderColor: colors.primary + "30",
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("reminderDate")}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1 },
                      {
                        borderColor: colors.border,
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderRadius: colors.radius,
                      },
                    ]}
                    value={reminderDateStr}
                    onChangeText={setReminderDateStr}
                    placeholder={t("datePlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <Pressable
                    style={[
                      styles.calendarBtn,
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

                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("reminderTime")}
                </Text>
                <Pressable
                  style={[
                    styles.timePickerBtn,
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
                    style={[styles.timePickerText, { color: colors.primary }]}
                  >
                    {formatTime12(reminderHours, reminderMinutes)}
                  </Text>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                </Pressable>
              </View>
            )}

            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
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

      <AnalogTimePicker
        visible={showTimePicker}
        initialHours={reminderHours}
        initialMinutes={reminderMinutes}
        onConfirm={(h, m) => {
          setReminderHours(h);
          setReminderMinutes(m);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />

      <Modal
        visible={showContactPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.contactOverlay}>
          <View style={[styles.contactSheet, { backgroundColor: colors.card }]}>
            <View style={styles.contactHeader}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t("pickFromContacts")}
              </Text>
              <Pressable
                onPress={() => setShowContactPicker(false)}
                hitSlop={12}
              >
                <MaterialIcons
                  name="close"
                  size={26}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
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
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholder="Search contacts..."
              placeholderTextColor={colors.mutedForeground}
            />
            <ScrollView style={styles.contactList}>
              {filteredContacts.map((c) => (
                <Pressable
                  key={c.name + (c.phoneNumbers?.[0]?.number || "")}
                  style={[
                    styles.contactItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setContactName(c.name || "");
                    setMobileNumber(
                      c.phoneNumbers?.[0]?.number?.replace(/\s/g, "") || "",
                    );
                    setShowContactPicker(false);
                    setShowSuggestions(false);
                  }}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.contactInfo}>
                    <Text
                      style={[styles.contactName, { color: colors.foreground }]}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={[
                        styles.contactPhone,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {c.phoneNumbers?.[0]?.number || ""}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DateTimePicker
        value={new Date()}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(event: any, selectedDate: any) => {
          setShowDatePicker(false);
          if (selectedDate) {
            const day = selectedDate.getDate();
            const month = selectedDate.getMonth() + 1;
            const year = selectedDate.getFullYear();
            setReminderDateStr(`${day}/${month}/${year}`);
          }
        }}
      />
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
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  contactPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  contactPickText: {
    fontSize: 15,
    fontWeight: "600",
  },
  orText: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 14,
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
    marginBottom: 16,
  },
  suggestBox: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxHeight: 180,
  },
  suggestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  suggestPhone: {
    fontSize: 12,
  },
  reminderToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  reminderToggleLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  reminderFields: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  timePickerText: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  saveBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  contactOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  contactSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    maxHeight: "80%",
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  contactList: {
    flex: 1,
    marginTop: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
  },
  contactPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  calendarBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
