import { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
import { ShieldAlert } from 'lucide-react-native';
import {
  getNotificationPreferences,
  syncScheduledNotifications,
  registerPushToken,
} from '@/lib/notifications';
import { UpdateOverlay } from '@/components/UpdateOverlay';
import { PaywallModal } from '@/components/PaywallModal';

SplashScreen.preventAutoHideAsync();

// ── Top-level ErrorBoundary ───────────────────────────────────────────────────
// Catches any uncaught render errors and shows an opulent recovery screen
interface EBState { hasError: boolean; message: string }
class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <View style={ebStyles.card}>
            <View style={ebStyles.iconWrap}>
              <ShieldAlert size={36} color="#7F1100" strokeWidth={1.8} />
            </View>
            <Text style={ebStyles.title}>Application Notice</Text>
            <Text style={ebStyles.sub}>{this.state.message || 'An unexpected runtime state was encountered.'}</Text>
            <TouchableOpacity
              style={ebStyles.btn}
              onPress={() => this.setState({ hasError: false, message: '' })}
              activeOpacity={0.8}
            >
              <Text style={ebStyles.btnText}>RELOAD WORKSPACE</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#DACFBD' },
  card:      { width: '100%', maxWidth: 400, backgroundColor: '#F7F3EB', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(2, 51, 45, 0.12)' },
  iconWrap:  { width: 68, height: 68, borderRadius: 24, backgroundColor: '#FCE8E6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: '700', color: '#02332D', marginBottom: 8, letterSpacing: -0.3 },
  sub:       { fontSize: 13, color: '#594E42', textAlign: 'center', marginBottom: 28, lineHeight: 19 },
  btn:       { width: '100%', height: 48, backgroundColor: '#02332D', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  btnText:   { color: '#DACFBD', fontWeight: '700', fontSize: 12, letterSpacing: 1.2 },
});

// ── Root layout ───────────────────────────────────────────────────────────────
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

  // Auth listener — robust local & remote session synchronization
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) {
          setSession(s);
          await AsyncStorage.setItem('@nourish_session', JSON.stringify(s));
        } else {
          const local = await AsyncStorage.getItem('@nourish_session');
          if (local) {
            try {
              setSession(JSON.parse(local));
            } catch {}
          }
        }
      } catch (err) {
        const local = await AsyncStorage.getItem('@nourish_session');
        if (local) {
          try {
            setSession(JSON.parse(local));
          } catch {}
        }
      }
      setAuthInit(true);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s) {
        setSession(s);
        AsyncStorage.setItem('@nourish_session', JSON.stringify(s)).catch(() => {});
        registerPushToken().catch(() => {});
      } else {
        const local = await AsyncStorage.getItem('@nourish_session');
        if (!local) {
          setSession(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync scheduled reminders (in parallel with auth — independent)
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

    // Show opulent preloader on every app launch for high-end opening sequence
    const timer = setTimeout(() => setAppReady(true), 1800);

    // Mandatory Authentication Gating:
    // Unauthenticated users are strictly routed to /login. No guest bypass allowed.
    if (!session && segments[0] !== 'login') {
      router.replace('/login');
    } else if (session && segments[0] === 'login') {
      router.replace('/(tabs)');
    }

    return () => clearTimeout(timer);
  }, [session, authInitialized, segments, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
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
