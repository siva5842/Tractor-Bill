import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ManualCalculatorModal } from "@/components/ManualCalculatorModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import { Pressable, Text } from "react-native";

function FABCalculator({ onPress, colors }: { onPress: () => void; colors: any }) {
  const insets = useSafeAreaInsets();
  const bottomPos = Platform.OS === "web" ? 100 : insets.bottom + 80;
  return (
    <Pressable
      style={[
        styles.calcFab,
        {
          backgroundColor: colors.accent,
          bottom: bottomPos,
          left: "50%",
        },
      ]}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <MaterialIcons name="calculate" size={26} color={colors.foreground} />
    </Pressable>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { t } = useApp();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const [showCalc, setShowCalc] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 0,
            paddingBottom: safeAreaInsets.bottom,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
              />
            ) : null,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("home"),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pending"
          options={{
            title: t("pending"),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="pending-actions" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="myqr"
          options={{
            title: t("myQr"),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="qr-code" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t("history"),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="history" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      <FABCalculator onPress={() => setShowCalc(true)} colors={colors} />
      <ManualCalculatorModal visible={showCalc} onClose={() => setShowCalc(false)} />
    </>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  calcFab: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -26,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 100,
  },
});
