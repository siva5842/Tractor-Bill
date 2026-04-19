import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function buildUPIString(upiId: string, name: string, amount: number) {
  const safeUpiId = upiId.trim().replace(/\s/g, "");
  const safeName = encodeURIComponent(name.trim());
  const safeAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${safeUpiId}&pn=${safeName}&am=${safeAmount}&cu=INR`;
}

interface Props {
  visible: boolean;
  amount: number;
  upiId?: string;
  userName?: string;
  onClose: () => void;
}

export function QRCodeModal({
  visible,
  amount,
  upiId: upiIdProp,
  userName: userNameProp,
  onClose,
}: Props) {
  const { t, profile } = useApp();
  const colors = useColors();

  const upiId = upiIdProp ?? profile.upiId ?? "";
  const userName = userNameProp ?? profile.name ?? "Tractor Bill";

  const upiString = buildUPIString(
    upiId || "yourname@upi",
    userName || "Tiller Bill",
    amount,
  );

  const handleOpenUPI = () => {
    Linking.openURL(upiString).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pay ₹${amount.toFixed(2)} via UPI: ${upiId}\n\nUPI Link: ${upiString}`,
        title: "Payment Request",
      });
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: 20 },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("generateQR")}
          </Text>
          <Text style={[styles.amount, { color: colors.primary }]}>
            ₹{amount.toFixed(2)}
          </Text>

          {!upiId ? (
            <View style={styles.noUpi}>
              <MaterialIcons name="warning" size={32} color={colors.accent} />
              <Text
                style={[styles.noUpiText, { color: colors.mutedForeground }]}
              >
                Set your UPI ID in Profile settings to generate a payment QR
                code.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.qrBox}>
                <QRCode
                  value={upiString}
                  size={240}
                  color="black"
                  backgroundColor="white"
                />
              </View>
              <Text style={[styles.upiId, { color: colors.mutedForeground }]}>
                {upiId}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.secondary, borderRadius: 10 },
                  ]}
                  onPress={handleShare}
                >
                  <MaterialIcons
                    name="share"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    Share Link
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            onPress={onClose}
          >
            <Text
              style={[styles.closeBtnText, { color: colors.primaryForeground }]}
            >
              {t("close")}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    alignItems: "center",
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  amount: {
    fontSize: 36,
    fontWeight: "800",
  },
  qrBox: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    elevation: 2,
  },
  upiId: {
    fontSize: 13,
    marginTop: -4,
  },
  noUpi: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  noUpiText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
