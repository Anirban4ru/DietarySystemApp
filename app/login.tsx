import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, AppState, Image, Platform, Animated, Dimensions, Easing } from 'react-native';
import { supabase } from '@/lib/supabase';
import { PressScale, useToast } from '@/components/ui';
import { type, spacing, palette, font } from '@/lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  // Custom expanding animation
  const circleScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const showAlert = (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      window.alert(title + (message ? ': ' + message : ''));
    } else {
      Alert.alert(title, message);
    }
  };

  const playAuthTransition = (callback: () => void) => {
    setLoading(true);
    Animated.sequence([
      Animated.timing(circleScale, {
        toValue: Math.max(SCREEN_W, SCREEN_H) / 10, // scale up huge
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    // After animation plays out beautifully, execute auth
    setTimeout(() => {
      callback();
    }, 700);
  };

  async function signInWithEmail() {
    playAuthTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        show(error.message, 'error');
        setLoading(false);
        circleScale.setValue(0);
        titleOpacity.setValue(0);
      }
    });
  }

  async function signUpWithEmail() {
    playAuthTransition(async () => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        show(error.message, 'error');
        setLoading(false);
        circleScale.setValue(0);
        titleOpacity.setValue(0);
      } else if (data.session == null) {
        show('Check email for confirmation link!', 'info');
        setLoading(false);
        circleScale.setValue(0);
        titleOpacity.setValue(0);
      } else {
        show('Account created successfully!', 'success');
      }
    });
  }

  return (
    <View style={styles.container}>
      {/* Background Decor */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Image source={require('../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 24 }} />
        </View>
        <Text style={[type.display, { color: palette.chalk, marginTop: spacing[4] }]}>Nourish</Text>
        <Text style={[type.body, { color: 'rgba(255,255,255,0.7)', marginTop: spacing[2], textAlign: 'center' }]}>
          Your intelligent dietary companion. Sign in to start managing your pantry and health.
        </Text>
      </View>

      <View style={styles.formPanel}>
        <Text style={[type.label, { color: palette.chalk, marginBottom: spacing[2] }]}>EMAIL</Text>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[type.label, { color: palette.chalk, marginTop: spacing[4], marginBottom: spacing[2] }]}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="********"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="none"
        />

        <View style={styles.buttonRow}>
          <PressScale onPress={signUpWithEmail} disabled={loading} style={[styles.btn, styles.btnOutline]}>
            <Text style={[styles.btnText, { color: palette.chalk }]}>SIGN UP</Text>
          </PressScale>
          <PressScale onPress={signInWithEmail} disabled={loading} style={[styles.btn, styles.btnSolid]}>
            <Text style={[styles.btnText, { color: palette.sageDeep }]}>SIGN IN</Text>
          </PressScale>
        </View>
      </View>

      {/* Expanding Transition Overlay */}
      <Animated.View
        pointerEvents={loading ? 'auto' : 'none'}
        style={[
          styles.transitionCircle,
          { transform: [{ scale: circleScale }] }
        ]}
      />
      
      {/* Auth Preloader Text that fades in over the expanded circle */}
      {loading && (
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.overlayContent, { opacity: titleOpacity }]}>
          <Text style={styles.overlayTitle}>NOURISH</Text>
          <Text style={styles.overlayTag}>INTELLIGENT DIETARY SYSTEMS</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
    backgroundColor: palette.sageDeep, // Rich dark aristocratic background
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[10],
    zIndex: 2,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: palette.chalk,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  formPanel: {
    padding: spacing[6],
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  input: {
    fontFamily: font.sans,
    fontSize: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    color: palette.chalk,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[8],
  },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnSolid: {
    backgroundColor: palette.chalk,
    shadowColor: palette.chalk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  transitionCircle: {
    position: 'absolute',
    bottom: SCREEN_H * 0.2,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2D24', // Even darker shade of sage for transition
    zIndex: 10,
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  overlayTitle: {
    fontFamily: font.sansBold,
    fontSize: 24,
    color: palette.chalk,
    letterSpacing: 10,
    marginBottom: 12,
  },
  overlayTag: {
    fontFamily: font.sans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  }
});
