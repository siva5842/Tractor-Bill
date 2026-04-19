import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AddEquipmentModal } from "@/components/AddEquipmentModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EquipmentCard } from "@/components/EquipmentCard";
import { ProfileModal } from "@/components/ProfileModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { SaveToPendingModal } from "@/components/SaveToPendingModal";
import { StopSessionModal } from "@/components/StopSessionModal";
import { TopAppBar } from "@/components/TopAppBar";
import { useApp } from "@/context/AppContext";
import { ActiveTimer, Equipment, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

type StopState = {
  timer: ActiveTimer;
  equipment: Equipment;
} | null;

type QRState = {
  amount: number;
} | null;

type PendingState = {
  amount: number;
  seconds: number;
  equipmentName: string;
} | null;

export default function HomeTab() {
  const { t, profile, confirmationSettings, timerSettings } = useApp();
  const colors = useColors();
  const { equipment, deleteEquipment, activeTimers, startTimer, pauseTimer, resumeTimer, stopTimer, addHistoryEntry } =
    useData();

  const [showAddEquip, setShowAddEquip] = useState(false);
  const [editTarget, setEditTarget] = useState<Equipment | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [stopState, setStopState] = useState<StopState>(null);
  const [qrState, setQrState] = useState<QRState>(null);
  const [pendingState, setPendingState] = useState<PendingState>(null);

  const handleStart = (equip: Equipment) => {
    console.log("Starting timer for:", equip.name, "allowSimultaneousTimers:", timerSettings.allowSimultaneousTimers);
    
    const currentActiveCount = Object.values(activeTimers).filter(t => t.status === "running").length;

    if (timerSettings.allowSimultaneousTimers === false && currentActiveCount > 0) {
      const runningEntry = Object.values(activeTimers).find(
        (timer) => timer.status === "running" && timer.equipmentId !== equip.id
      );
      if (runningEntry) {
        const runningEquip = equipment.find((e) => e.id === runningEntry.equipmentId);
        const name = runningEquip?.name ?? "another equipment";
        const msg = t("timerBlockedMsg")?.replace("{name}", name) ?? `Stop the current timer for ${name} first.`;
        Alert.alert(t("timerBlockedTitle") ?? "Timer Running", msg, [{ text: t("cancel") ?? "OK", style: "cancel" }]);
        return;
      }
    }
    startTimer(equip.id);
  };

  const handleStop = (equip: Equipment) => {
    if (confirmationSettings.confirmExitTimer) {
      Alert.alert(t("confirmExitTimer"), t("confirmExitTimerDesc"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("stop"),
          style: "destructive",
          onPress: () => {
            const timer = stopTimer(equip.id);
            if (timer) {
              setStopState({ timer, equipment: equip });
            }
          },
        },
      ]);
    } else {
      const timer = stopTimer(equip.id);
      if (timer) {
        setStopState({ timer, equipment: equip });
      }
    }
  };

  const handleGenerateQR = (amount: number, seconds: number) => {
    if (stopState) {
      addHistoryEntry({
        type: "session",
        title: stopState.equipment.name,
        amount,
        durationSeconds: seconds,
        equipmentName: stopState.equipment.name,
      });
    }
    setStopState(null);
    setQrState({ amount });
  };

  const handleSaveToPending = (amount: number, seconds: number) => {
    setStopState(null);
    setPendingState({
      amount,
      seconds,
      equipmentName: stopState?.equipment.name ?? "",
    });
  };

  const handleFinish = () => {
    if (stopState) {
      const timer = stopState.timer;
      const totalSeconds = timer.accumulatedSeconds;
      const amount = parseFloat(((totalSeconds / 3600) * stopState.equipment.hourlyRate).toFixed(2));
      addHistoryEntry({
        type: "session",
        title: stopState.equipment.name,
        amount,
        durationSeconds: totalSeconds,
        equipmentName: stopState.equipment.name,
      });
    }
    setStopState(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteEquipment(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDeleteRequest = (equip: Equipment) => {
    if (confirmationSettings.confirmDeletions) {
      setDeleteTarget(equip);
    } else {
      deleteEquipment(equip.id);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TopAppBar onProfilePress={() => setShowProfile(true)} />

      <FlatList
        data={equipment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="agriculture" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              {t("noEquipment")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {t("noEquipmentDesc")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <EquipmentCard
            equipment={item}
            timer={activeTimers[item.id]}
            onStart={() => handleStart(item)}
            onPause={() => pauseTimer(item.id)}
            onResume={() => resumeTimer(item.id)}
            onStop={() => handleStop(item)}
            onEdit={() => setEditTarget(item)}
            onDelete={() => handleDeleteRequest(item)}
          />
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAddEquip(true);
        }}
      >
        <MaterialIcons name="add" size={32} color={colors.primaryForeground} />
      </Pressable>

      <AddEquipmentModal
        visible={showAddEquip || !!editTarget}
        onClose={() => {
          setShowAddEquip(false);
          setEditTarget(null);
        }}
        editEquipment={editTarget || undefined}
      />

      <ProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <ConfirmDeleteModal
        visible={!!deleteTarget}
        title={t("deleteEquipmentTitle")}
        message={t("deleteEquipmentMsg")}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {stopState && (
        <StopSessionModal
          visible={!!stopState}
          timer={stopState.timer}
          equipment={stopState.equipment}
          onGenerateQR={handleGenerateQR}
          onSaveToPending={handleSaveToPending}
          onFinish={handleFinish}
          onClose={() => setStopState(null)}
        />
      )}

      {qrState && (
        <QRCodeModal
          visible={!!qrState}
          amount={qrState.amount}
          onClose={() => setQrState(null)}
        />
      )}

      {pendingState && (
        <SaveToPendingModal
          visible={!!pendingState}
          amount={pendingState.amount}
          durationSeconds={pendingState.seconds}
          equipmentName={pendingState.equipmentName}
          onClose={() => setPendingState(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: {
    paddingVertical: 10,
    paddingBottom: 120,
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
});
