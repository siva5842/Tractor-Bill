import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { ActiveTimer, Equipment } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { TimerDisplay } from "./TimerDisplay";

interface Props {
  equipment: Equipment;
  timer?: ActiveTimer;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDelete: () => void;
}

export function EquipmentCard({
  equipment,
  timer,
  onStart,
  onPause,
  onResume,
  onStop,
  onDelete,
}: Props) {
  const { t } = useApp();
  const colors = useColors();
  const pulseAnim = useSharedValue(1);

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const isActive = isRunning || isPaused;

  useEffect(() => {
    if (isRunning) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 200 });
    }
  }, [isRunning]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStart();
  };

  const currentEarnings = timer
    ? parseFloat(
        (
          ((isRunning
            ? timer.accumulatedSeconds + Math.floor((Date.now() - timer.startTime) / 1000)
            : timer.accumulatedSeconds) /
            3600) *
          equipment.hourlyRate
        ).toFixed(2)
      )
    : 0;

  return (
    <Animated.View style={cardAnimStyle}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isActive ? colors.timerActive ?? colors.secondary : colors.card,
            borderRadius: colors.radius,
            borderWidth: isActive ? 2 : 1,
            borderColor: isActive ? colors.timerBorder ?? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.top}>
          {equipment.photoUri ? (
            <Image source={{ uri: equipment.photoUri }} style={[styles.photo, { borderRadius: colors.radius - 4 }]} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.secondary, borderRadius: colors.radius - 4 }]}>
              <MaterialIcons name="agriculture" size={28} color={colors.primary} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {equipment.name}
            </Text>
            <Text style={[styles.rate, { color: colors.mutedForeground }]}>
              ₹{equipment.hourlyRate}/hr
            </Text>
            {isActive && (
              <View style={styles.timerRow}>
                <TimerDisplay
                  accumulatedSeconds={timer!.accumulatedSeconds}
                  isRunning={isRunning}
                  startTime={timer!.startTime}
                />
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {!isActive ? (
              <Pressable
                style={[styles.startBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}
                onPress={handleStart}
              >
                <MaterialIcons name="play-arrow" size={28} color={colors.primaryForeground} />
                <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
                  {t("start")}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.timerControls}>
                {isRunning ? (
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
                    onPress={onPause}
                  >
                    <MaterialIcons name="pause" size={22} color={colors.foreground} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.controlBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}
                    onPress={onResume}
                  >
                    <MaterialIcons name="play-arrow" size={22} color={colors.primaryForeground} />
                  </Pressable>
                )}
                <Pressable
                  style={[styles.controlBtn, { backgroundColor: colors.destructive, borderRadius: 8 }]}
                  onPress={onStop}
                >
                  <MaterialIcons name="stop" size={22} color={colors.destructiveForeground} />
                </Pressable>
              </View>
            )}
            {!isActive && (
              <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
                <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
              </Pressable>
            )}
          </View>
        </View>

        {isActive && (
          <View style={[styles.earningsRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>
              {t("earnings")}
            </Text>
            <Text style={[styles.earningsValue, { color: colors.primary }]}>
              ₹{currentEarnings.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  photo: {
    width: 56,
    height: 56,
    resizeMode: "cover",
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  rate: {
    fontSize: 13,
    fontWeight: "500",
  },
  timerRow: {
    marginTop: 4,
  },
  actions: {
    alignItems: "center",
    gap: 8,
  },
  startBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 72,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  timerControls: {
    flexDirection: "row",
    gap: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    padding: 4,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: "800",
  },
});
