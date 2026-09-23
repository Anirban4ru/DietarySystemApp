import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular, SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, ToastProvider, SplashOverlay, useTheme } from '@/components/ui';
import { ProProvider } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import {
  getNotificationPreferences,
  syncScheduledNotifications,
} from '@/lib/notifications';
import { UpdateOverlay } from '@/components/UpdateOverlay';
import { PaywallModal } from '@/components/PaywallModal';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular':       Inter_400Regular,
    'Inter-Medium':        Inter_500Medium,
    'Inter-Bold':          Inter_700Bold,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Bold':   SpaceGrotesk_700Bold,
  });

  const [session, setSession]          = useState<Session | null>(null);
  const [authInitialized, setAuthInit] = useState(false);
  const [appReady, setAppReady]        = useState(false);
  const segments = useSegments();
  const router   = useRouter();

  // Auth listener — handle onboarding redirect for new signups
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInit(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      // When a brand-new user signs in for the first time, send to onboarding
      if (s && _e === 'SIGNED_IN') {
        try {
          const done = await AsyncStorage.getItem('@nourish_onboarding_done');
          if (!done) {
            // Small delay so auth state settles before navigating
            setTimeout(() => router.replace('/onboarding' as any), 200);
          }
        } catch (_err) {
          // ignore storage errors, let them into the app
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync scheduled reminders
  useEffect(() => {
    getNotificationPreferences().then((prefs) => {
      syncScheduledNotifications(prefs);
    });
  }, []);

  // Hide splash + navigate
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!authInitialized) return;

    SplashScreen.hideAsync();

    const timer = setTimeout(() => setAppReady(true), 100);

    // Only redirect to tabs if user is actively on the login screen and has a valid session
    if (session && segments[0] === 'login') {
      router.replace('/(tabs)');
    }

    return () => clearTimeout(timer);
  }, [session, authInitialized, segments, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <ProProvider>
          <AppContent />
          <PaywallModal />
        </ProProvider>
        <UpdateOverlay />
        {/* Animated splash overlay — hides once appReady */}
        <SplashOverlay visible={!appReady} />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { mode } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
