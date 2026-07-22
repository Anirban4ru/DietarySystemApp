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
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, ToastProvider, SplashOverlay, useTheme, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import {
  registerForPushNotifications,
  scheduleDailyMealReminder,
  scheduleDailyShoppingReminder,
} from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [hasOnboarded, setHasOnboarded]   = useState<boolean | null>(null);
  const segments = useSegments();
  const router   = useRouter();

  // Onboarding listener
  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

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
    
    if (hasOnboarded === null) return; // Wait for async storage

    if (!session) {
      if (!hasOnboarded && segments[0] !== 'onboarding' && segments[0] !== 'login') {
        router.replace('/onboarding');
      } else if (hasOnboarded && segments[0] !== 'login' && segments[0] !== 'onboarding') {
        router.replace('/login');
      }
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)');
    }

    return () => clearTimeout(timer);
  }, [session, authInitialized, segments, fontsLoaded, fontError, hasOnboarded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
        {/* Animated splash overlay — hides once appReady */}
        <SplashOverlay visible={!appReady} />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors, mode } = useTheme();
  const { show } = useToast();
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (isUpdatePending) {
      show('A new update has been downloaded!', 'info', {
        label: 'RESTART',
        onPress: () => Updates.reloadAsync()
      });
    }
  }, [isUpdatePending, show]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
