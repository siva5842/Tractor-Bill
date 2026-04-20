import notifee, { EventType } from "@notifee/react-native";

notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // Keep service alive until stopForegroundService is called
  });
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction?.id === "pause_timer" || detail.pressAction?.id === "resume_timer" || detail.pressAction?.id === "stop_timer") {
      // In background, we can't easily access the DataContext hooks.
      // However, Notifee background events can be used to wake up the app or perform silent updates if state is persisted.
      // For this implementation, we rely on the app launching to foreground for 'stop_timer'.
      // For 'pause_timer', it will be handled when the app is active.
    }
  }
});

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary as AppErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { AppProvider, useApp } from "@/context/AppContext";
import { DataProvider, useData } from "@/context/DataContext";

SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) { 
  return ( 
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}> 
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red' }}>FATAL CRASH:</Text> 
      <Text>{error.message}</Text> 
      <Text style={{ marginTop: 10 }}>{error.stack}</Text> 
    </View> 
  ); 
}

const FONT_TIMEOUT_MS = 6000;

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasSeenOnboarding, setHasSeenOnboarding, onboardingReady } = useApp();
  const { activeTimers, pauseTimer, resumeTimer, stopTimer, equipment } = useData();

  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id || "";
        
        if (actionId.startsWith("pause_timer_")) {
          const equipmentId = actionId.replace("pause_timer_", "");
          pauseTimer(equipmentId);
        } else if (actionId.startsWith("resume_timer_")) {
          const equipmentId = actionId.replace("resume_timer_", "");
          resumeTimer(equipmentId);
        } else if (actionId.startsWith("stop_timer_")) {
          const equipmentId = actionId.replace("stop_timer_", "");
          stopTimer(equipmentId);
          // The app is launched into foreground via launchActivity: 'default'
        } else if (actionId === "pause_timer") {
          const running = Object.values(activeTimers).find(t => t.status === "running");
          if (running) pauseTimer(running.equipmentId);
        } else if (actionId === "resume_timer") {
          const paused = Object.values(activeTimers).find(t => t.status === "paused");
          if (paused) resumeTimer(paused.equipmentId);
        } else if (actionId === "stop_timer") {
          const running = Object.values(activeTimers).find(t => t.status === "running");
          if (running) stopTimer(running.equipmentId);
        }
      }
    });
  }, [activeTimers, pauseTimer, resumeTimer, stopTimer]);

  const handleOnboardingDone = async () => {
    await setHasSeenOnboarding(true);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {onboardingReady && !hasSeenOnboarding && (
        <OnboardingScreen onDone={handleOnboardingDone} />
      )}
    </>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      WebBrowser.maybeCompleteAuthSession();
    }
    let timer: NodeJS.Timeout;
    
    async function prepare() {
      try {
        await Promise.race([
          Font.loadAsync({
            Inter_400Regular,
            Inter_500Medium,
            Inter_600SemiBold,
            Inter_700Bold,
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error("Font loading timed out"));
            }, FONT_TIMEOUT_MS);
          })
        ]);
      } catch (e) {
        console.warn("Startup async task error (fonts will fallback to system):", e);
      } finally {
        if (timer) clearTimeout(timer);
        setAppIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  if (!appIsReady) return null;

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <DataProvider>
                  <RootLayoutNav />
                </DataProvider>
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
