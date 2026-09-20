import { useEffect, useState, useRef } from 'react';
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
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, ToastProvider, SplashOverlay, useTheme } from '@/components/ui';
import { ProProvider } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import {
  registerForPushNotifications,
  scheduleDailyMealReminder,
  scheduleDailyShoppingReminder,
} from '@/lib/notifications';
import { UpdateOverlay } from '@/components/UpdateOverlay';

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

  const [session, setSession]             = useState<Session | null>(null);
  const [authInitialized, setAuthInit]    = useState(false);
  const [appReady, setAppReady]           = useState(false);
  const segments = useSegments();
  const router   = useRouter();

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInit(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Register push notifications
  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        scheduleDailyMealReminder();
        scheduleDailyShoppingReminder();
      }
    });
  }, []);

  // Navigation + hide native splash
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!authInitialized) return;

    SplashScreen.hideAsync();

    // Give animated splash a moment to show
    const timer = setTimeout(() => setAppReady(true), 100);

    const inTabsGroup = segments[0] === '(tabs)';
    if (!session && inTabsGroup) {
      router.replace('/login');
    } else if (session && !inTabsGroup) {
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
        </ProProvider>
        <UpdateOverlay />
        {/* Animated splash overlay — hides once appReady */}
        <SplashOverlay visible={!appReady} />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors, mode } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

