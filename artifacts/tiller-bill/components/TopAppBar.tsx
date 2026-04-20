import { MaterialIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { Language } from "@/i18n/translations";
import { useColors } from "@/hooks/useColors";

interface Props {
  onProfilePress: () => void;
  onCalculatorPress: () => void;
  title?: string;
}

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ta", label: "தமிழ்", flag: "🌾" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
];

export function TopAppBar({ onProfilePress, onCalculatorPress, title }: Props) {
  const { t, profile, language, setLanguage, setHasSeenOnboarding } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;
  const menuTop = topPad + 56 + 8;

  const initials = (profile.name || "S")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const openMenu = () => {
    setLangMenuVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 18 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => setLangMenuVisible(false));
  };

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    closeMenu();
  };

  const handleHelpPress = async () => {
    await setHasSeenOnboarding(false);
  };

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.primary,
            paddingTop: topPad + 8,
          },
        ]}
      >
        <View style={styles.left}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.appName, { color: colors.primaryForeground }]}>
            {title ?? t("appName")}
          </Text>
        </View>

        <View style={styles.rightRow}>
          <Pressable
            onPress={handleHelpPress}
            style={[styles.iconBtn, { backgroundColor: colors.primaryForeground + "22" }]}
            hitSlop={10}
          >
            <MaterialIcons name="help-outline" size={22} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            onPress={openMenu}
            style={[styles.iconBtn, { backgroundColor: colors.primaryForeground + "22" }]}
            hitSlop={10}
          >
            <MaterialIcons name="language" size={22} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            onPress={onCalculatorPress}
            style={[styles.iconBtn, { backgroundColor: colors.primaryForeground + "22" }]}
            hitSlop={10}
          >
            <MaterialIcons name="calculate" size={22} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            onPress={onProfilePress}
            style={[styles.avatar, { backgroundColor: colors.primaryForeground + "22" }]}
          >
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      {langMenuVisible && (
        <Modal transparent animationType="none" visible onRequestClose={closeMenu}>
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.menuCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
                    { top: menuTop },
                  ]}
                >
                  <View style={[styles.menuArrow, { borderBottomColor: colors.card }]} />
                  {LANGUAGES.map((lang, idx) => {
                    const isActive = language === lang.code;
                    return (
                      <Pressable
                        key={lang.code}
                        onPress={() => handleSelect(lang.code)}
                        style={[
                          styles.menuItem,
                          isActive && { backgroundColor: colors.primary + "18" },
                          idx < LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <Text style={styles.menuFlag}>{lang.flag}</Text>
                        <Text
                          style={[
                            styles.menuLabel,
                            { color: isActive ? colors.primary : colors.foreground },
                            isActive && { fontWeight: "700" },
                          ]}
                        >
                          {lang.label}
                        </Text>
                        {isActive && (
                          <MaterialIcons name="check" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 9,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  menuOverlay: {
    flex: 1,
  },
  menuCard: {
    position: "absolute",
    right: 16,
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  menuArrow: {
    position: "absolute",
    top: -8,
    right: 48,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuFlag: {
    fontSize: 20,
  },
  menuLabel: {
    fontSize: 15,
    flex: 1,
  },
});
