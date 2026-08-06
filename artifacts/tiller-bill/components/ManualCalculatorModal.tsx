import { MaterialIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AddPendingModal } from "@/components/AddPendingModal";
import { StopSessionModal } from "@/components/StopSessionModal";
import { useApp } from "@/context/AppContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaveToPending: (amount: number) => void;
}

export function ManualCalculatorModal({ visible, onClose, onSaveToPending }: Props) {
  const { t } = useApp();
  const colors = useColors();
  const { addHistoryEntry } = useData();

  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("flat");
  const [discountValue, setDiscountValue] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [showAddPending, setShowAddPending] = useState(false);

  const [showStopSession, setShowStopSession] = useState(false);

  const calculate = () => {
    try {
      // Fallback to 0 for all math variables
      const safeRate = Number(rate) || 0;
      const safeHours = Number(hours) || 0;
      const safeMinutes = Number(minutes) || 0;
      const safeDiscount = Number(discountValue) || 0;

      if (safeRate <= 0) {
        Alert.alert(t("missingField"), t("enterValidRate"));
        return;
      }
      if (safeHours === 0 && safeMinutes === 0) {
        Alert.alert(t("missingField"), t("enterHoursOrMinutes"));
        return;
      }

      const totalHours = safeHours + safeMinutes / 60;
      let calcResult = safeRate * totalHours;

      // Apply discount
      if (discountType === "percent") {
        calcResult = calcResult * (1 - safeDiscount / 100);
      } else {
        calcResult = calcResult - safeDiscount;
      }

      if (isNaN(calcResult) || !isFinite(calcResult)) {
        throw new Error("Calculation resulted in invalid number");
      }

      setResult(Number(calcResult.toFixed(2)));
      setSavedToast(false);
    } catch (error) {
      console.error("Calculator Error:", error);
      Alert.alert("Error", "Something went wrong during calculation.");
      setResult(0);
    }
  };

  const reset = () => {
    setRate("");
    setHours("");
    setMinutes("");
    setDiscountValue("");
    setResult(null);
    setSavedToast(false);
    setShowAddPending(false);
    setShowStopSession(false);
  };

  const handleSaveToHistory = () => {
    if (result === null) return;
    setShowStopSession(true);
  };

  const handleConfirmFinish = (customerData: { name: string; phone: string; image?: string }) => {
    if (result === null) return;
    const totalSecs =
      (parseFloat(hours) || 0) * 3600 + (parseFloat(minutes) || 0) * 60;
    addHistoryEntry({
      type: "calculator",
      title: `${t("rate")}: ₹${rate}/hr`,
      amount: result,
      durationSeconds: totalSecs > 0 ? totalSecs : undefined,
      contactName: customerData.name,
      mobileNumber: customerData.phone,
      profilePic: customerData.image,
    });
    setSavedToast(true);
    setShowStopSession(false);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 2000);
  };

  const handleSaveToPending = () => {
    if (result === null || result <= 0) return;
    setShowAddPending(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <MaterialIcons name="calculate" size={28} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("manualCalc")}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
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
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("rate")}
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
              value={rate}
              onChangeText={(text) => setRate(text.replace(/[^0-9.]/g, ""))}
              placeholder={t("ratePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("hours")}
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
                  value={hours}
                  onChangeText={(text) => setHours(text.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("minutes")}
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
                  value={minutes}
                  onChangeText={(text) => setMinutes(text.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.discountContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t("discount")}
              </Text>
              <View style={styles.discountRow}>
                <Pressable
                  style={[
                    styles.discountTypeBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        discountType === "flat"
                          ? colors.primary
                          : colors.background,
                    },
                  ]}
                  onPress={() => setDiscountType("flat")}
                >
                  <Text
                    style={{
                      color:
                        discountType === "flat"
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontWeight: "600",
                    }}
                  >
                    ₹
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.discountTypeBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        discountType === "percent"
                          ? colors.primary
                          : colors.background,
                    },
                  ]}
                  onPress={() => setDiscountType("percent")}
                >
                  <Text
                    style={{
                      color:
                        discountType === "percent"
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontWeight: "600",
                    }}
                  >
                    %
                  </Text>
                </Pressable>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      borderColor: colors.border,
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderRadius: colors.radius,
                      marginBottom: 0,
                    },
                  ]}
                  value={discountValue}
                  onChangeText={(text) =>
                    setDiscountValue(text.replace(/[^0-9.]/g, ""))
                  }
                  placeholder={
                    discountType === "percent"
                      ? t("percentage")
                      : t("flatAmount")
                  }
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.calcBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  marginTop: 16,
                },
              ]}
              onPress={calculate}
            >
              <Text
                style={[
                  styles.calcBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t("calculate")}
              </Text>
            </Pressable>

            {result !== null && (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: colors.timerActive ?? colors.secondary,
                    borderColor: colors.primary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t("totalBill")}
                </Text>
                <Text style={[styles.resultValue, { color: colors.primary }]}>
                  ₹{String(result.toFixed(2))}
                </Text>
                <View style={styles.resultActions}>
                  <Pressable
                    onPress={handleSaveToHistory}
                    style={[
                      styles.saveHistoryBtn,
                      {
                        backgroundColor: savedToast
                          ? "#2E7D32"
                          : colors.primary + "18",
                        borderRadius: colors.radius,
                        borderColor: savedToast ? "#2E7D32" : colors.primary,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={savedToast ? "check-circle" : "history"}
                      size={16}
                      color={savedToast ? "#fff" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.saveHistoryText,
                        { color: savedToast ? "#fff" : colors.primary },
                      ]}
                    >
                      {savedToast ? t("savedToHistory") : t("saveToHistory")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveToPending}
                    style={[
                      styles.pendingBtn,
                      {
                        backgroundColor: colors.primary + "18",
                        borderRadius: colors.radius,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person-add"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.pendingBtnText, { color: colors.primary }]}
                    >
                      {t("addToPending") || "Add to Pending"}
                    </Text>
                  </Pressable>
                  <Pressable onPress={reset} hitSlop={8}>
                    <Text
                      style={[
                        styles.resetText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {t("reset")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <AddPendingModal
        visible={showAddPending}
        onClose={() => {
          setShowAddPending(false);
          onClose();
        }}
        initialAmount={result?.toFixed(2)}
      />

      <SaveCalculatedHistoryModal
        visible={showStopSession}
        amount={result || 0}
        onFinish={handleConfirmFinish}
        onClose={() => setShowStopSession(false)}
      />
    </Modal>
  );
}

interface SaveHistoryProps {
  visible: boolean;
  amount: number;
  onFinish: (data: { name: string; phone: string; image?: string }) => void;
  onClose: () => void;
}

function SaveCalculatedHistoryModal({ visible, amount, onFinish, onClose }: SaveHistoryProps) {
  const { t } = useApp();
  const colors = useColors();
  const [contactName, setContactName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Image picker error:", e);
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("cameraPermission") || "Camera Permission", t("allowCamera") || "Please allow camera access to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  };

  const pickProfilePic = () => {
    Alert.alert(t("choosePhoto") || "Choose Photo", t("selectSource") || "Select source", [
      { text: t("camera") || "Camera", onPress: pickFromCamera },
      { text: t("gallery") || "Gallery", onPress: pickFromGallery },
      { text: t("cancel") || "Cancel", style: "cancel" },
    ]);
  };

  const pickContact = async () => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
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
            setMobileNumber(contact.phoneNumbers[0].number?.replace(/\s/g, "") || "");
          }
          if (contact.imageAvailable && contact.image && contact.image.uri) {
            setProfilePic(contact.image.uri);
          }
        }
      } else {
        Alert.alert(t("contactsPermission") || "Permission Denied", "Please allow access to contacts.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinish = () => {
    if (!contactName.trim()) {
      Alert.alert(t("missingField"), t("enterContactName"));
      return;
    }
    onFinish({ name: contactName.trim(), phone: mobileNumber.trim(), image: profilePic });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: 24, alignItems: "center" }]}>
            <Text style={[styles.title, { color: colors.foreground, marginBottom: 10 }]}>{t("customerDetails")}</Text>
            <Text style={[styles.resultValue, { color: colors.primary, fontSize: 24, marginBottom: 10 }]}>₹{amount.toFixed(2)}</Text>
            
            <View style={styles.photoSection}>
              <Pressable
                onPress={pickProfilePic}
                style={[
                  styles.photoBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    style={styles.profilePic}
                  />
                ) : (
                  <MaterialIcons
                    name="add-a-photo"
                    size={32}
                    color={colors.primary}
                  />
                )}
              </Pressable>
              <Text
                style={[styles.photoLabel, { color: colors.mutedForeground }]}
              >
                {profilePic ? t("changePhoto") : t("addPhoto")}
              </Text>
            </View>

            <Pressable
              style={[styles.contactPickBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, marginBottom: 15 }]}
              onPress={pickContact}
            >
              <MaterialIcons name="contacts" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("pickFromContacts")}</Text>
            </Pressable>

            <TextInput
              style={[styles.input, { width: "100%", borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
              value={contactName}
              onChangeText={setContactName}
              placeholder={t("contactName")}
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[styles.input, { width: "100%", borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder={t("mobileNumber")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

            <Pressable
              style={[styles.calcBtn, { width: "100%", backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={handleFinish}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{t("save")}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.mutedForeground }}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </ScrollView>
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
    paddingBottom: 40,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  discountContainer: {
    marginTop: 8,
  },
  discountRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  discountTypeBtn: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  calcBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  calcBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  resultBox: {
    borderWidth: 2,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  resultValue: {
    fontSize: 42,
    fontWeight: "800",
  },
  resultActions: {
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  saveHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  saveHistoryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  photoBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  profilePic: {
    width: "100%",
    height: "100%",
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  resetText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  pendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  pendingBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pendingFormBox: {
    padding: 16,
    marginTop: 12,
  },
  pendingFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 12,
  },
  pendingFormActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
