import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Language, translations, TranslationKey } from "@/i18n/translations";

export interface UserProfile {
  name: string;
  upiId: string;
  photoUri?: string;
  isSignedIn: boolean;
  email?: string;
  displayName?: string;
  googleAccessToken?: string;
}

export interface ConfirmationSettings {
  confirmDeletions: boolean;
  confirmMarkAsPaid: boolean;
  confirmExitTimer: boolean;
  confirmHistoryDeletion: boolean;
}

export interface TimerSettings {
  allowSimultaneousTimers: boolean;
}

const DEFAULT_CONFIRMATION_SETTINGS: ConfirmationSettings = {
  confirmDeletions: true,
  confirmMarkAsPaid: true,
  confirmExitTimer: true,
  confirmHistoryDeletion: true,
};

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  allowSimultaneousTimers: false,
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  myQrUri: string | null;
  setMyQrUri: (uri: string | null) => void;
  signIn: (accessToken: string, email: string, displayName: string) => void;
  signOut: () => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => Promise<void>;
  onboardingReady: boolean;
  confirmationSettings: ConfirmationSettings;
  updateConfirmationSettings: (updates: Partial<ConfirmationSettings>) => void;
  timerSettings: TimerSettings;
  updateTimerSettings: (updates: Partial<TimerSettings>) => void;
}

const defaultProfile: UserProfile = {
  name: "Sivaprakasham",
  upiId: "",
  isSignedIn: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [myQrUri, setMyQrUriState] = useState<string | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [confirmationSettings, setConfirmationSettings] = useState<ConfirmationSettings>(
    DEFAULT_CONFIRMATION_SETTINGS
  );
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(DEFAULT_TIMER_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const [lang, profileStr, qr, onboarding, confirmStr, timerStr] = await Promise.all([
          AsyncStorage.getItem("@tiller_language"),
          AsyncStorage.getItem("@tiller_profile"),
          AsyncStorage.getItem("@tiller_myqr"),
          AsyncStorage.getItem("@tiller_onboarding"),
          AsyncStorage.getItem("@tiller_confirmation_settings"),
          AsyncStorage.getItem("@tiller_timer_settings"),
        ]);
        if (lang === "en" || lang === "ta" || lang === "hi") setLanguageState(lang);
        if (profileStr) setProfile(JSON.parse(profileStr));
        if (qr) setMyQrUriState(qr);
        setHasSeenOnboardingState(onboarding === "true");
        if (confirmStr) {
          setConfirmationSettings({ ...DEFAULT_CONFIRMATION_SETTINGS, ...JSON.parse(confirmStr) });
        }
        if (timerStr) {
          setTimerSettings({ ...DEFAULT_TIMER_SETTINGS, ...JSON.parse(timerStr) });
        }
      } catch {}
      setOnboardingReady(true);
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("@tiller_language", lang);
  }, []);

  const setHasSeenOnboarding = useCallback(async (value: boolean) => {
    setHasSeenOnboardingState(value);
    await AsyncStorage.setItem("@tiller_onboarding", String(value));
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem("@tiller_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const signIn = useCallback(
    async (accessToken: string, email: string, displayName: string) => {
      const updates: Partial<UserProfile> = {
        isSignedIn: true,
        email,
        displayName,
        googleAccessToken: accessToken,
        name: displayName || profile.name,
      };
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        AsyncStorage.setItem("@tiller_profile", JSON.stringify(next));
        return next;
      });
    },
    [profile.name]
  );

  const signOut = useCallback(async () => {
    setProfile((prev) => {
      const next = {
        ...prev,
        isSignedIn: false,
        email: undefined,
        displayName: undefined,
        googleAccessToken: undefined,
      };
      AsyncStorage.setItem("@tiller_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const setMyQrUri = useCallback(async (uri: string | null) => {
    setMyQrUriState(uri);
    if (uri) await AsyncStorage.setItem("@tiller_myqr", uri);
    else await AsyncStorage.removeItem("@tiller_myqr");
  }, []);

  const updateConfirmationSettings = useCallback(
    (updates: Partial<ConfirmationSettings>) => {
      setConfirmationSettings((prev) => {
        const next = { ...prev, ...updates };
        AsyncStorage.setItem("@tiller_confirmation_settings", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateTimerSettings = useCallback(
    (updates: Partial<TimerSettings>) => {
      setTimerSettings((prev) => {
        const next = { ...prev, ...updates };
        AsyncStorage.setItem("@tiller_timer_settings", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const t = useCallback(
    (key: TranslationKey): string => {
      return (
        (translations[language] as Record<string, string>)[key] ??
        (translations.en as Record<string, string>)[key] ??
        key
      );
    },
    [language]
  );

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        profile,
        updateProfile,
        myQrUri,
        setMyQrUri,
        signIn,
        signOut,
        hasSeenOnboarding,
        setHasSeenOnboarding,
        onboardingReady,
        confirmationSettings,
        updateConfirmationSettings,
        timerSettings,
        updateTimerSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
