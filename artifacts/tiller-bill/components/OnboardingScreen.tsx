import { MaterialIcons } from "@expo/vector-icons";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { Language } from "@/i18n/translations";
import { useColors } from "@/hooks/useColors";

GoogleSignin.configure({
  webClientId:
    "234691857286-bktdmjbvs55m10rc4ds78gliid4si6nm.apps.googleusercontent.com",
});

const { width: SCREEN_W } = Dimensions.get("window");

const LANGUAGES: {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", flag: "🌾" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी", flag: "🇮🇳" },
];

interface TourSlide {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor: string;
  titleKey:
    | "onboardingStep2Title"
    | "onboardingStep3Title"
    | "onboardingStep4Title"
    | "onboardingStep5Title";
  descKey:
    | "onboardingStep2Desc"
    | "onboardingStep3Desc"
    | "onboardingStep4Desc"
    | "onboardingStep5Desc";
}

const TOUR_SLIDES: TourSlide[] = [
  {
    icon: "agriculture",
    iconColor: "#2E7D32",
    titleKey: "onboardingStep2Title",
    descKey: "onboardingStep2Desc",
  },
  {
    icon: "timer",
    iconColor: "#1565C0",
    titleKey: "onboardingStep3Title",
    descKey: "onboardingStep3Desc",
  },
  {
    icon: "pending-actions",
    iconColor: "#F9A825",
    titleKey: "onboardingStep4Title",
    descKey: "onboardingStep4Desc",
  },
  {
    icon: "qr-code",
    iconColor: "#6A1B9A",
    titleKey: "onboardingStep5Title",
    descKey: "onboardingStep5Desc",
  },
];

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const { t, language, setLanguage } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"language" | "tour">("language");
  const [tourIndex, setTourIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (toValue: number, cb: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      cb();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleContinue = () => {
    animateTransition(0, () => setStep("tour"));
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log("Google sign-in success:", userInfo);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === statusCodes.SIGN_IN_CANCELLED) {
          console.log("User cancelled login");
        } else if (error.message === statusCodes.IN_PROGRESS) {
          console.log("Sign in in progress");
        } else if (error.message === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log("Play services not available");
        } else {
          console.log("Google sign-in error:", error.message);
        }
      }
    }
  };

  const handleNext = () => {
    if (tourIndex < TOUR_SLIDES.length - 1) {
      animateTransition(0, () => setTourIndex((i) => i + 1));
    } else {
      onDone();
    }
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  return (
    <View
      style={[styles.overlay, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {step === "language" ? (
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={[styles.logoRow]}>
              <MaterialIcons name="grass" size={40} color={colors.primary} />
              <Text style={[styles.appName, { color: colors.primary }]}>
                {t("appName")}
              </Text>
            </View>

            <Text style={[styles.langTitle, { color: colors.foreground }]}>
              {t("onboardingChooseLang")}
            </Text>
            <Text style={[styles.langSub, { color: colors.mutedForeground }]}>
              {t("onboardingChooseLangSub")}
            </Text>

            <View style={styles.langList}>
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => handleLanguageSelect(lang.code)}
                    style={[
                      styles.langOption,
                      {
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        backgroundColor: isSelected
                          ? colors.primary + "12"
                          : colors.background,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.langNative,
                          { color: colors.foreground },
                        ]}
                      >
                        {lang.nativeLabel}
                      </Text>
                      {lang.nativeLabel !== lang.label && (
                        <Text
                          style={[
                            styles.langEnglish,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {lang.label}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <MaterialIcons name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={handleContinue}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t("onboardingContinue")}
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={colors.primaryForeground}
              />
            </Pressable>

            <Pressable
              style={[
                styles.googleBtn,
                { borderColor: colors.border, borderRadius: colors.radius },
              ]}
              onPress={signInWithGoogle}
            >
              <Text
                style={[styles.googleBtnText, { color: colors.foreground }]}
              >
                Sign in with Google
              </Text>
            </Pressable>

            <Pressable onPress={onDone} style={styles.skipBtn} hitSlop={12}>
              <Text
                style={[styles.skipText, { color: colors.mutedForeground }]}
              >
                {t("onboardingSkip")}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.progressRow}>
              {TOUR_SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === tourIndex ? colors.primary : colors.border,
                      width: i === tourIndex ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <View
              style={[
                styles.iconCircle,
                { backgroundColor: TOUR_SLIDES[tourIndex].iconColor + "18" },
              ]}
            >
              <MaterialIcons
                name={TOUR_SLIDES[tourIndex].icon}
                size={72}
                color={TOUR_SLIDES[tourIndex].iconColor}
              />
            </View>

            <Text style={[styles.tourTitle, { color: colors.foreground }]}>
              {t(TOUR_SLIDES[tourIndex].titleKey)}
            </Text>
            <Text style={[styles.tourDesc, { color: colors.mutedForeground }]}>
              {t(TOUR_SLIDES[tourIndex].descKey)}
            </Text>

            <Pressable
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={handleNext}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {tourIndex < TOUR_SLIDES.length - 1
                  ? t("onboardingNext")
                  : t("onboardingGetStarted")}
              </Text>
              <MaterialIcons
                name={
                  tourIndex < TOUR_SLIDES.length - 1
                    ? "arrow-forward"
                    : "rocket-launch"
                }
                size={20}
                color={colors.primaryForeground}
              />
            </Pressable>

            <Pressable onPress={onDone} style={styles.skipBtn} hitSlop={12}>
              <Text
                style={[styles.skipText, { color: colors.mutedForeground }]}
              >
                {t("onboardingSkip")}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 28,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  langTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  langSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  langList: {
    width: "100%",
    gap: 10,
    marginBottom: 4,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 2,
    gap: 14,
  },
  langFlag: {
    fontSize: 28,
  },
  langNative: {
    fontSize: 17,
    fontWeight: "700",
  },
  langEnglish: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  tourTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  tourDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    width: "100%",
    marginTop: 8,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
