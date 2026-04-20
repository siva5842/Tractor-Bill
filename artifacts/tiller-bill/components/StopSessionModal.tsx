import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { ActiveTimer, Equipment } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  timer: ActiveTimer | null;
  equipment: Equipment;
  onGenerateQR: (amount: number, seconds: number) => void;
  onSaveToPending: (amount: number, seconds: number) => void;
  onFinish: () => void;
  onClose: () => void;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StopSessionModal({
  visible,
  timer,
  equipment,
  onGenerateQR,
  onSaveToPending,
  onFinish,
  onClose,
}: Props) {
  const { t } = useApp();
  const colors = useColors();

  const totalSeconds = timer?.accumulatedSeconds ?? 0;
  const calculatedAmount = parseFloat(
    ((totalSeconds / 3600) * equipment.hourlyRate).toFixed(2)
  );

  const [showAmountEditor, setShowAmountEditor] = useState(false);
  const [editableAmount, setEditableAmount] = useState(
    calculatedAmount.toFixed(2)
  );
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("");

  useEffect(() => {
    if (visible) {
      setEditableAmount(calculatedAmount.toFixed(2));
      setShowAmountEditor(false);
    }
  }, [visible, calculatedAmount]);

  const handleQRPress = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let finalAmount = calculatedAmount;
    const dv = parseFloat(discountValue) || 0;
    if (dv > 0) {
      if (discountType === "flat") {
        finalAmount = Math.max(0, calculatedAmount - dv);
      } else {
        finalAmount = Math.max(0, calculatedAmount - (calculatedAmount * dv) / 100);
      }
    }
    setEditableAmount(finalAmount.toFixed(2));
    setShowAmountEditor(true);
  };

  const handleConfirmQR = () => {
    const finalAmount = parseFloat(editableAmount);
    const amount =
      isNaN(finalAmount) || finalAmount < 0 ? calculatedAmount : finalAmount;
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAmountEditor(false);
    onGenerateQR(amount, totalSeconds);
  };

  const handleSave = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let finalAmount = calculatedAmount;
    const dv = parseFloat(discountValue) || 0;
    if (dv > 0) {
      if (discountType === "flat") {
        finalAmount = Math.max(0, calculatedAmount - dv);
      } else {
        finalAmount = Math.max(0, calculatedAmount - (calculatedAmount * dv) / 100);
      }
    }
    onSaveToPending(finalAmount, totalSeconds);
  };

  const handleFinish = () => {
    onFinish();
  };

  if (showAmountEditor) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAmountEditor(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[styles.sheet, { backgroundColor: colors.card, borderRadius: 24 }]}
          >
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="edit" size={40} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("editFinalAmount")}
            </Text>
            <Text style={[styles.equip, { color: colors.mutedForeground }]}>
              {t("editFinalAmountDesc")}
            </Text>

            <View
              style={[
                styles.amountInputWrapper,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.rupeeSymbol, { color: colors.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                value={editableAmount}
                onChangeText={setEditableAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
                autoFocus
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={handleConfirmQR}
            >
              <MaterialIcons name="qr-code" size={22} color={colors.primaryForeground} />
              <Text
                style={[styles.actionBtnText, { color: colors.primaryForeground }]}
              >
                {t("confirmAndGenerateQR")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn,
                {
                  borderColor: colors.border,
                  borderWidth: 1.5,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => setShowAmountEditor(false)}
            >
              <MaterialIcons
                name="arrow-back"
                size={22}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.actionBtnText, { color: colors.mutedForeground }]}
              >
                {t("cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.sheet, { backgroundColor: colors.card, borderRadius: 24 }]}
        >
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="stop-circle" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("sessionStopped")}
          </Text>
          <Text style={[styles.equip, { color: colors.mutedForeground }]}>
            {equipment.name}
          </Text>

          <View style={[styles.summaryRow, { borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                {t("totalTime")}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {formatTime(totalSeconds)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                {t("totalAmount")}
              </Text>
              <Text style={[styles.summaryValueBig, { color: colors.primary }]}>
                ₹{(() => {
                  const dv = parseFloat(discountValue) || 0;
                  if (dv > 0) {
                    if (discountType === "flat") {
                      return Math.max(0, calculatedAmount - dv).toFixed(2);
                    } else {
                      return Math.max(0, calculatedAmount - (calculatedAmount * dv) / 100).toFixed(2);
                    }
                  }
                  return calculatedAmount.toFixed(2);
                })()}
              </Text>
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
                    borderTopLeftRadius: colors.radius,
                    borderBottomLeftRadius: colors.radius,
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
                    borderTopRightRadius: colors.radius,
                    borderBottomRightRadius: colors.radius,
                    marginBottom: 0,
                    height: 48,
                    paddingHorizontal: 12,
                    borderWidth: 1.5,
                  },
                ]}
                value={discountValue}
                onChangeText={(text) =>
                  setDiscountValue(text.replace(/[^0-9.]/g, ""))
                }
                placeholder={
                  discountType === "percent" ? t("percentage") : t("flatAmount")
                }
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            onPress={handleQRPress}
          >
            <MaterialIcons name="qr-code" size={22} color={colors.primaryForeground} />
            <Text
              style={[styles.actionBtnText, { color: colors.primaryForeground }]}
            >
              {t("generateQR")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              { backgroundColor: colors.accent, borderRadius: colors.radius },
            ]}
            onPress={handleSave}
          >
            <MaterialIcons
              name="pending-actions"
              size={22}
              color={colors.foreground}
            />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>
              {t("saveToPending")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              {
                borderColor: colors.border,
                borderWidth: 1.5,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleFinish}
          >
            <MaterialIcons
              name="check-circle"
              size={22}
              color={colors.mutedForeground}
            />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>
              {t("finish")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: 28,
    paddingBottom: 44,
    alignItems: "center",
    gap: 12,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  equip: {
    fontSize: 15,
    marginBottom: 4,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
    overflow: "hidden",
  },
  summaryItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  divider: {
    width: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryValueBig: {
    fontSize: 24,
    fontWeight: "800",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: "100%",
    marginVertical: 8,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: "800",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  input: {
    fontSize: 16,
  },
  discountContainer: {
    width: "100%",
    marginBottom: 16,
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  discountTypeBtn: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -1.5,
    zIndex: 1,
  },
});
