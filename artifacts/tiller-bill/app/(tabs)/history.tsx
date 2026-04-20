import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { TopAppBar } from "@/components/TopAppBar";
import { ProfileModal } from "@/components/ProfileModal";
import { ManualCalculatorModal } from "@/components/ManualCalculatorModal";
import { AddPendingModal } from "@/components/AddPendingModal";
import { useApp } from "@/context/AppContext";
import { HistoryEntry, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(seconds?: number) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type FilterMode = "all" | "month";

interface MonthYear { month: number; year: number }

function getMonthLabel(my: MonthYear) {
  return `${MONTHS[my.month]} ${my.year}`;
}

function sameMonth(ts: number, my: MonthYear) {
  const d = new Date(ts);
  return d.getMonth() === my.month && d.getFullYear() === my.year;
}

interface HistoryCardProps {
  entry: HistoryEntry;
  onDelete: () => void;
  onEdit: () => void;
}

function HistoryCard({ entry, onDelete, onEdit }: HistoryCardProps) {
  const { t } = useApp();
  const colors = useColors();

  const typeConfig = {
    session: { icon: "timer" as const, color: "#1565C0", labelKey: "historyTypeSession" as const },
    paid_debt: { icon: "check-circle" as const, color: "#2E7D32", labelKey: "historyTypePaid" as const },
    calculator: { icon: "calculate" as const, color: "#6A1B9A", labelKey: "historyTypeCalc" as const },
  };

  const cfg = typeConfig[entry.type];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.iconBadge, { backgroundColor: cfg.color + "18" }]}>
        {entry.profilePic ? (
          <Image
            source={{ uri: entry.profilePic }}
            style={styles.avatarImgSmall}
          />
        ) : (
          <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
        )}
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={[styles.cardAmount, { color: "#2E7D32" }]}>
            +₹{entry.amount.toFixed(0)}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.color + "18" }]}>
            <Text style={[styles.typeLabel, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
          </View>
          {entry.equipmentName && entry.type !== "session" && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              · {entry.equipmentName}
            </Text>
          )}
          {!!entry.durationSeconds && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              · {formatTime(entry.durationSeconds)}
            </Text>
          )}
        </View>
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
          {formatDate(entry.createdAt)}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.actionBtn}
          activeOpacity={0.5}
        >
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.actionBtn}
          activeOpacity={0.5}
        >
          <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface EditHistoryModalProps {
  visible: boolean;
  entry: HistoryEntry | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<HistoryEntry>) => void;
}

function EditHistoryModal({ visible, entry, onClose, onSave }: EditHistoryModalProps) {
  const { t } = useApp();
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setAmount(entry.amount.toString());
      setPhone(entry.mobileNumber || "");
      setProfilePic(entry.profilePic);
      const d = new Date(entry.createdAt);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      setDateStr(`${day}/${month}/${year}`);
    }
  }, [entry]);

  const pickProfilePic = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("galleryPermission"), t("galleryPermissionDenied"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!entry) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert(t("error"), t("enterValidAmount"));
      return;
    }

    let finalCreatedAt = entry.createdAt;
    if (dateStr) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0])
        );
        if (!isNaN(d.getTime())) {
          finalCreatedAt = d.getTime();
        }
      }
    }

    onSave(entry.id, {
      title: title.trim(),
      contactName: title.trim(),
      amount: amt,
      mobileNumber: phone.trim(),
      profilePic,
      createdAt: finalCreatedAt,
    });
    onClose();
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/[^0-9]/g, ""));
  };

  const handleDateParsing = (text: string, setter: (val: string) => void) => {
    let raw = text.replace(/[^0-9]/g, "");
    if (raw.length === 8) {
      const formatted =
        raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
      setter(formatted);
    } else {
      setter(text);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: 20 }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("editHistory")}</Text>

          <ScrollView style={styles.modalScroll}>
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
                {profilePic ? t("changeQR") : t("addPhoto")}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t("contactName")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("enterContactName")}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t("mobileNumber")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={t("phonePlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t("amount")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
                value={amount}
                onChangeText={setAmount}
                placeholder={t("amountPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t("date") || "Date"}
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
                value={dateStr}
                onChangeText={(text) => handleDateParsing(text, setDateStr)}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1, borderRadius: colors.radius }]}>
              <Text style={{ color: colors.foreground }}>{t("cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{t("save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HistoryTab() {
  const { t, confirmationSettings } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { historyEntries, pendingDebts, deleteHistoryEntry, updateHistoryEntry } = useData();
  const [showProfile, setShowProfile] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPendingAmount, setCalcPendingAmount] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);

  const totalIncome = useMemo(
    () => historyEntries.reduce((sum, e) => sum + e.amount, 0),
    [historyEntries]
  );

  const totalPending = useMemo(
    () => pendingDebts.reduce((sum, d) => sum + d.totalAmount, 0),
    [pendingDebts]
  );

  const filteredEntries = useMemo(() => {
    if (filterMode === "all") return historyEntries;
    return historyEntries.filter((e) => sameMonth(e.createdAt, selectedMonth));
  }, [historyEntries, filterMode, selectedMonth]);

  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: MonthYear[] = [];
    historyEntries.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        months.push({ month: d.getMonth(), year: d.getFullYear() });
      }
    });
    return months.sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [historyEntries]);

  const filteredIncome = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + e.amount, 0),
    [filteredEntries]
  );

  const handleDeleteEntry = (id: string) => {
    const doDelete = () => deleteHistoryEntry(id);

    if (!confirmationSettings.confirmHistoryDeletion) {
      doDelete();
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `${t("confirmHistoryDeleteTitle")}\n\n${t("confirmHistoryDeleteMsg")}`
      );
      if (confirmed) doDelete();
    } else {
      Alert.alert(
        t("confirmHistoryDeleteTitle"),
        t("confirmHistoryDeleteMsg"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("delete"), style: "destructive", onPress: doDelete },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TopAppBar
        onProfilePress={() => setShowProfile(true)}
        onCalculatorPress={() => setShowCalculator(true)}
        title={t("history")}
      />

      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.analyticsSection}>
          <View style={[styles.analyticsCard, { backgroundColor: "#2E7D32" + "12", borderColor: "#2E7D32" + "44", borderRadius: colors.radius }]}>
            <MaterialIcons name="trending-up" size={28} color="#2E7D32" />
            <Text style={styles.analyticsLabel}>{t("totalIncomeEarned")}</Text>
            <Text style={[styles.analyticsValue, { color: "#2E7D32" }]}>
              ₹{totalIncome.toFixed(0)}
            </Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: "#C62828" + "12", borderColor: "#C62828" + "44", borderRadius: colors.radius }]}>
            <MaterialIcons name="pending-actions" size={28} color="#C62828" />
            <Text style={styles.analyticsLabel}>{t("totalPendingDebts")}</Text>
            <Text style={[styles.analyticsValue, { color: "#C62828" }]}>
              ₹{totalPending.toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
          <Pressable
            style={[
              styles.filterBtn,
              filterMode === "all" && { backgroundColor: colors.primary },
              { borderRadius: colors.radius, borderColor: filterMode === "all" ? colors.primary : colors.border },
            ]}
            onPress={() => setFilterMode("all")}
          >
            <Text style={[styles.filterBtnText, { color: filterMode === "all" ? colors.primaryForeground : colors.mutedForeground }]}>
              {t("allTime")}
            </Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {availableMonths.map((my) => {
              const isSelected = filterMode === "month" && selectedMonth.month === my.month && selectedMonth.year === my.year;
              return (
                <Pressable
                  key={`${my.year}-${my.month}`}
                  style={[
                    styles.filterBtn,
                    isSelected && { backgroundColor: colors.primary },
                    { borderRadius: colors.radius, borderColor: isSelected ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    setFilterMode("month");
                    setSelectedMonth(my);
                  }}
                >
                  <Text style={[styles.filterBtnText, { color: isSelected ? colors.primaryForeground : colors.mutedForeground }]}>
                    {getMonthLabel(my)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {filterMode === "month" && (
          <View style={[styles.monthSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.monthSummaryText, { color: colors.mutedForeground }]}>
              {getMonthLabel(selectedMonth)}
            </Text>
            <Text style={[styles.monthSummaryAmount, { color: "#2E7D32" }]}>
              ₹{filteredIncome.toFixed(0)}
            </Text>
          </View>
        )}

        {filteredEntries.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="history" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              {t("historyEmpty")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {t("historyEmptyDesc")}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredEntries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDeleteEntry(entry.id)}
                onEdit={() => setEditingEntry(entry)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditHistoryModal
        visible={!!editingEntry}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={updateHistoryEntry}
      />

      <ManualCalculatorModal
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSaveToPending={(amount) => {
          setCalcPendingAmount(amount);
          setShowCalculator(false);
        }}
      />

      <AddPendingModal
        visible={calcPendingAmount !== null}
        onClose={() => setCalcPendingAmount(null)}
        initialAmount={calcPendingAmount?.toString()}
      />

      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  analyticsSection: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  analyticsCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  analyticsLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    color: "#555",
    letterSpacing: 0.3,
  },
  analyticsValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  monthSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthSummaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  monthSummaryAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImgSmall: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
    alignSelf: "flex-start",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  modalScroll: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
