import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const CLOCK_SIZE = 264;
const CENTER = CLOCK_SIZE / 2;
const HOUR_RADIUS = 96;
const MINUTE_RADIUS = 96;
const HAND_RADIUS = 82;
const DOT_RADIUS = 5;
const KNOB_RADIUS = 18;

interface Props {
  visible: boolean;
  initialHours?: number;
  initialMinutes?: number;
  onConfirm: (hours: number, minutes: number) => void;
  onCancel: () => void;
}

type Phase = "hour" | "minute";

function angleFromCenter(x: number, y: number): number {
  const dx = x - CENTER;
  const dy = y - CENTER;
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return angle;
}

function padZero(n: number) {
  return String(n).padStart(2, "0");
}

export function AnalogTimePicker({ visible, initialHours = 9, initialMinutes = 0, onConfirm, onCancel }: Props) {
  const colors = useColors();

  const initH = initialHours > 12 ? initialHours - 12 : initialHours === 0 ? 12 : initialHours;
  const initPeriod = initialHours >= 12 ? "PM" : "AM";

  const [phase, setPhase] = useState<Phase>("hour");
  const [selectedHour, setSelectedHour] = useState(initH);
  const [selectedMinute, setSelectedMinute] = useState(initialMinutes);
  const [period, setPeriod] = useState<"AM" | "PM">(initPeriod);

  const handAngle = useRef(new Animated.Value((initH % 12) * 30)).current;
  const knobScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setPhase("hour");
      setSelectedHour(initH);
      setSelectedMinute(initialMinutes);
      setPeriod(initPeriod);
      handAngle.setValue((initH % 12) * 30);
    }
  }, [visible]);

  const animateHand = useCallback(
    (toAngle: number) => {
      Animated.spring(handAngle, {
        toValue: toAngle,
        useNativeDriver: true,
        tension: 220,
        friction: 14,
      }).start();
    },
    [handAngle]
  );

  const handleClockTouch = useCallback(
    (x: number, y: number, release?: boolean) => {
      const angle = angleFromCenter(x, y);
      if (phase === "hour") {
        const raw = Math.round(angle / 30) % 12;
        const hour = raw === 0 ? 12 : raw;
        setSelectedHour(hour);
        animateHand((hour % 12) * 30);
        if (release) {
          setPhase("minute");
          animateHand(selectedMinute * 6);
        }
      } else {
        const minute = Math.round(angle / 6) % 60;
        setSelectedMinute(minute);
        animateHand(minute * 6);
      }
    },
    [phase, selectedMinute, animateHand]
  );

  const handleConfirm = () => {
    let h = selectedHour % 12;
    if (period === "PM") h += 12;
    onConfirm(h, selectedMinute);
  };

  const switchToHour = () => {
    setPhase("hour");
    animateHand((selectedHour % 12) * 30);
  };

  const switchToMinute = () => {
    setPhase("minute");
    animateHand(selectedMinute * 6);
  };

  const handRotation = handAngle.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const hourLabels = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteLabels = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getNumberPos = (index: number, radius: number) => {
    const angle = (index / 12) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
  };

  const isHourSelected = (h: number) => phase === "hour" && selectedHour === h;
  const isMinuteSelected = (m: number) => phase === "minute" && selectedMinute === m;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.card }]}>
          <View style={[styles.timeHeader, { backgroundColor: colors.primary }]}>
            <Pressable onPress={switchToHour} style={styles.timeSegment}>
              <Text style={[
                styles.timeDigit,
                { color: phase === "hour" ? "#fff" : "rgba(255,255,255,0.55)" }
              ]}>
                {padZero(selectedHour)}
              </Text>
            </Pressable>
            <Text style={[styles.timeSep, { color: "rgba(255,255,255,0.8)" }]}>:</Text>
            <Pressable onPress={switchToMinute} style={styles.timeSegment}>
              <Text style={[
                styles.timeDigit,
                { color: phase === "minute" ? "#fff" : "rgba(255,255,255,0.55)" }
              ]}>
                {padZero(selectedMinute)}
              </Text>
            </Pressable>
            <View style={styles.periodCol}>
              <Pressable
                style={[styles.periodBtn, period === "AM" && styles.periodBtnActive]}
                onPress={() => setPeriod("AM")}
              >
                <Text style={[styles.periodText, period === "AM" && { color: "#fff" }]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.periodBtn, period === "PM" && styles.periodBtnActive]}
                onPress={() => setPeriod("PM")}
              >
                <Text style={[styles.periodText, period === "PM" && { color: "#fff" }]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.clockWrapper}>
            <View
              style={[styles.clockFace, { backgroundColor: colors.background }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) =>
                handleClockTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)
              }
              onResponderMove={(e) =>
                handleClockTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)
              }
              onResponderRelease={(e) =>
                handleClockTouch(e.nativeEvent.locationX, e.nativeEvent.locationY, true)
              }
            >
              {(phase === "hour" ? hourLabels : minuteLabels).map((val, idx) => {
                const pos = getNumberPos(idx, phase === "hour" ? HOUR_RADIUS : MINUTE_RADIUS);
                const isActive = phase === "hour" ? isHourSelected(val) : isMinuteSelected(val);
                const showLabel = phase === "hour" || val % 5 === 0;
                const label = phase === "hour" ? String(val) : padZero(val);

                return (
                  <Pressable
                    key={val}
                    style={[
                      styles.numberContainer,
                      {
                        left: pos.x - 20,
                        top: pos.y - 20,
                        backgroundColor: isActive ? colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => {
                      if (phase === "hour") {
                        setSelectedHour(val);
                        animateHand((val % 12) * 30);
                        setTimeout(() => {
                          setPhase("minute");
                          animateHand(selectedMinute * 6);
                        }, 160);
                      } else {
                        setSelectedMinute(val);
                        animateHand(val * 6);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.numberText,
                        { color: isActive ? "#fff" : colors.foreground },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}

              <Animated.View
                style={[
                  styles.handContainer,
                  { transform: [{ rotate: handRotation }] },
                ]}
              >
                <View style={[styles.hand, { backgroundColor: colors.primary }]} />
                <View style={[styles.handKnob, { backgroundColor: colors.primary }]} />
              </Animated.View>

              <View style={[styles.centerDot, { backgroundColor: colors.primary }]} />
            </View>
          </View>

          <Text style={[styles.phaseHint, { color: colors.mutedForeground }]}>
            {phase === "hour" ? "Select hour" : "Select minute"}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={onCancel}>
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleConfirm}>
              <Text style={[styles.actionText, { color: colors.primary, fontWeight: "700" }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 320,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 4,
  },
  timeSegment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeDigit: {
    fontSize: 52,
    fontWeight: "300",
    letterSpacing: -2,
    lineHeight: 58,
  },
  timeSep: {
    fontSize: 48,
    fontWeight: "300",
    lineHeight: 58,
    marginBottom: 4,
  },
  periodCol: {
    marginLeft: 8,
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderColor: "rgba(255,255,255,0.8)",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
  },
  clockWrapper: {
    alignItems: "center",
    paddingVertical: 16,
  },
  clockFace: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_SIZE / 2,
    position: "relative",
  },
  numberContainer: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 14,
    fontWeight: "600",
  },
  handContainer: {
    position: "absolute",
    left: CENTER,
    top: CENTER,
    width: 0,
    height: 0,
  },
  hand: {
    position: "absolute",
    left: -1.5,
    bottom: 0,
    width: 3,
    height: HAND_RADIUS,
    borderRadius: 2,
  },
  handKnob: {
    position: "absolute",
    left: -KNOB_RADIUS / 2 + 0.5,
    bottom: HAND_RADIUS - KNOB_RADIUS / 2,
    width: KNOB_RADIUS,
    height: KNOB_RADIUS,
    borderRadius: KNOB_RADIUS / 2,
    opacity: 0.9,
  },
  centerDot: {
    position: "absolute",
    left: CENTER - DOT_RADIUS,
    top: CENTER - DOT_RADIUS,
    width: DOT_RADIUS * 2,
    height: DOT_RADIUS * 2,
    borderRadius: DOT_RADIUS,
  },
  phaseHint: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
