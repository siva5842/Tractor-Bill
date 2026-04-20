import * as Contacts from "expo-contacts";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
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
  onEditCustomer: () => void;
  onEditLineItem: (item: any) => void;
  onDeleteLineItem: (itemId: string) => void;
}

function HistoryCard({ entry, onDelete, onEditCustomer, onEditLineItem, onDeleteLineItem }: HistoryCardProps) {
  const { t } = useApp();
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const typeConfig = {
    session: { icon: "timer" as const, color: "#1565C0", labelKey: "historyTypeSession" as const },
    paid_debt: { icon: "check-circle" as const, color: "#2E7D32", labelKey: "historyTypePaid" as const },
    calculator: { icon: "calculate" as const, color: "#6A1B9A", labelKey: "historyTypeCalc" as const },
  };

  const cfg = typeConfig[entry.type];

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Pressable style={styles.cardMain} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.iconBadge, { backgroundColor: cfg.color + "18" }]}>
          {entry.profilePic ? (
            <Image
              source={{ uri: String(entry.profilePic) }}
              style={styles.avatarImgSmall}
            />
          ) : (
            <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                {entry.title}
              </Text>
              <Pressable onPress={onEditCustomer} hitSlop={12}>
                <MaterialIcons name="edit" size={14} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={[styles.cardAmount, { color: "#2E7D32" }]}>
              +₹{entry.amount.toFixed(0)}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.color + "18" }]}>
              <Text style={[styles.typeLabel, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
            </View>
            {entry.lineItems && entry.lineItems.length > 0 && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                · {entry.lineItems.length} {entry.lineItems.length === 1 ? t("item") : t("items")}
              </Text>
            )}
            <MaterialIcons 
              name={expanded ? "expand-less" : "expand-more"} 
              size={18} 
              color={colors.mutedForeground} 
            />
          </View>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {formatDate(entry.createdAt)}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onDelete}
            style={styles.actionBtn}
            activeOpacity={0.5}
          >
            <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </Pressable>

      {expanded && entry.lineItems && entry.lineItems.length > 0 && (
        <View style={[styles.ledger, { borderTopColor: colors.border }]}>
          {entry.lineItems.map((item) => (
            <View key={item.id} style={[styles.ledgerItem, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemDesc, { color: colors.foreground }]}>{item.description}</Text>
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={[styles.itemAmount, { color: colors.foreground }]}>₹{item.amount.toFixed(2)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 8 }}>
                <Pressable onPress={() => onEditLineItem(item)} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => onDeleteLineItem(item.id)} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                  <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface EditHistoryCustomerModalProps {
  visible: boolean;
  entry: HistoryEntry | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<HistoryEntry>) => void;
}

function EditHistoryCustomerModal({ visible, entry, onClose, onSave }: EditHistoryCustomerModalProps) {
  const { t } = useApp();
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setPhone(entry.mobileNumber || "");
      setProfilePic(entry.profilePic);
    }
  }, [entry]);

  const pickProfilePic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setProfilePic(result.assets[0].uri);
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
        setTitle(contact.name || "");
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          setPhone(contact.phoneNumbers[0].number?.replace(/\s/g, "") || "");
        }
        const photoUri = contact.image?.uri ? String(contact.image.uri) : undefined;
        setProfilePic(photoUri);
      }
    } catch (err) {
      console.error("Error picking contact:", err);
    }
  };

  const handleSave = () => {
    if (!entry) return;
    onSave(entry.id, {
      title: title.trim(),
      contactName: title.trim(),
      mobileNumber: phone.trim(),
      profilePic,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: 20 }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Customer</Text>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.photoSection}>
              <Pressable onPress={pickProfilePic} style={[styles.photoBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {profilePic ? <Image source={{ uri: String(profilePic) }} style={styles.profilePic} /> : <MaterialIcons name="add-a-photo" size={32} color={colors.primary} />}
              </Pressable>
              <Text style={[styles.photoLabel, { color: colors.mutedForeground }]}>{profilePic ? t("changeQR") : t("addPhoto")}</Text>
            </View>
            <Pressable style={[styles.contactPickBtn, { backgroundColor: colors.secondary, borderRadius: colors.radius, marginHorizontal: 20, marginBottom: 16 }]} onPress={pickContact}>
              <MaterialIcons name="contacts" size={20} color={colors.primary} />
              <Text style={[styles.contactPickText, { color: colors.primary }]}>{t("pickFromContacts")}</Text>
            </Pressable>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t("contactName")}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]} value={title} onChangeText={setTitle} placeholder={t("enterContactName")} placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t("mobileNumber")}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ""))} placeholder={t("phonePlaceholder")} placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1, borderRadius: colors.radius }]}><Text style={{ color: colors.foreground }}>{t("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}><Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{t("save")}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface EditHistoryItemModalProps {
  visible: boolean;
  entry: HistoryEntry | null;
  item: any;
  onClose: () => void;
  onSave: (id: string, updates: Partial<HistoryEntry>) => void;
}

function EditHistoryItemModal({ visible, entry, item, onClose, onSave }: EditHistoryItemModalProps) {
  const { t } = useApp();
  const colors = useColors();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  React.useEffect(() => {
    if (item) {
      setAmount(item.amount.toString());
      setDescription(item.description || "");
    }
  }, [item]);

  const handleSave = () => {
    if (!entry || !item) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert(t("error"), t("enterValidAmount"));
      return;
    }

    const newLineItems = entry.lineItems?.map((li: any) =>
      li.id === item.id ? { ...li, amount: amt, description: description.trim() } : li
    );
    const newTotal = newLineItems?.reduce((sum: number, li: any) => sum + li.amount, 0) || 0;

    onSave(entry.id, {
      lineItems: newLineItems,
      amount: newTotal,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: 20, marginBottom: "20%" }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Item</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("amount")}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]} value={amount} onChangeText={setAmount} placeholder={t("amountPlaceholder")} placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("notes")}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1, borderRadius: colors.radius }]}><Text style={{ color: colors.foreground }}>{t("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}><Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{t("save")}</Text></TouchableOpacity>
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
  const [editingCustomer, setEditingCustomer] = useState<HistoryEntry | null>(null);
  const [editingItem, setEditingItem] = useState<{ entry: HistoryEntry; item: any } | null>(null);

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

  const handleDeleteLineItem = (entryId: string, itemId: string) => {
    const entry = historyEntries.find((e) => e.id === entryId);
    if (!entry || !entry.lineItems) return;

    const doDelete = () => {
      const newLineItems = entry.lineItems!.filter((li) => li.id !== itemId);
      if (newLineItems.length === 0) {
        deleteHistoryEntry(entryId);
      } else {
        const newTotal = newLineItems.reduce((sum, li) => sum + li.amount, 0);
        updateHistoryEntry(entryId, {
          lineItems: newLineItems,
          amount: newTotal,
        });
      }
    };

    if (!confirmationSettings.confirmDeletions) {
      doDelete();
      return;
    }

    Alert.alert(
      t("deletePendingTitle") || "Delete Item",
      t("deletePendingMsg") || "Are you sure you want to delete this record?",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: doDelete },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TopAppBar
        onProfilePress={() => setShowProfile(true)}
        onCalculatorPress={() => setShowCalculator(true)}
        title={t("history")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
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
                onEditCustomer={() => setEditingCustomer(entry)}
                onEditLineItem={(item) => setEditingItem({ entry, item })}
                onDeleteLineItem={(itemId) => handleDeleteLineItem(entry.id, itemId)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditHistoryCustomerModal
        visible={!!editingCustomer}
        entry={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={updateHistoryEntry}
      />

      <EditHistoryItemModal
        visible={!!editingItem}
        entry={editingItem?.entry || null}
        item={editingItem?.item}
        onClose={() => setEditingItem(null)}
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
  cardContainer: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
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
  actionBtn: {
    padding: 8,
  },
  contactPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 10,
  },
  contactPickText: {
    fontSize: 15,
    fontWeight: "700",
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
