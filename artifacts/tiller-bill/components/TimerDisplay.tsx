import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  accumulatedSeconds: number;
  isRunning: boolean;
  startTime: number;
  large?: boolean;
}

export function TimerDisplay({ accumulatedSeconds, isRunning, startTime, large = false }: Props) {
  const colors = useColors();
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const currentElapsed = isRunning
    ? accumulatedSeconds + Math.floor((Date.now() - startTime) / 1000)
    : accumulatedSeconds;

  const h = Math.floor(currentElapsed / 3600);
  const m = Math.floor((currentElapsed % 3600) / 60);
  const s = currentElapsed % 60;
  const display = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <Text
      style={[
        large ? styles.large : styles.small,
        { color: isRunning ? colors.primary : colors.mutedForeground, fontWeight: "700" },
      ]}
    >
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  large: {
    fontSize: 48,
    letterSpacing: 2,
  },
  small: {
    fontSize: 18,
    letterSpacing: 1,
  },
});
