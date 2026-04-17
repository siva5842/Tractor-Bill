import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopAppBar } from "@/components/TopAppBar";
import { ProfileModal } from "@/components/ProfileModal";
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
}

function HistoryCard({ entry, onDelete }: HistoryCardProps) {
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
        <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
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

      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        activeOpacity={0.5}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryTab() {
  const { t, confirmationSettings } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { historyEntries, pendingDebts, deleteHistoryEntry } = useData();
  const [showProfile, setShowProfile] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const totalIncome = useMemo(
    () => historyEntries.reduce((sum, e) => sum + e.amount, 0),
    [historyEntries]
  );

  const totalPending = useMemo(
    () => pendingDebts.reduce((sum, d) => sum + d.amount, 0),
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
      <TopAppBar onProfilePress={() => setShowProfile(true)} title={t("history")} />

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
              />
            ))}
          </View>
        )}
      </ScrollView>

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
});
