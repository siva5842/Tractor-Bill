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
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { AppProvider, useApp } from "@/context/AppContext";
import { DataProvider } from "@/context/DataContext";

SplashScreen.preventAutoHideAsync();

const FONT_TIMEOUT_MS = 6000;

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasSeenOnboarding, setHasSeenOnboarding, onboardingReady } = useApp();

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
      <ErrorBoundary>
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
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
