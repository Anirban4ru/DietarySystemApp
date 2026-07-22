import {
  ReactNode, createContext, useContext, useState, useEffect,
  useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ViewStyle, Platform,
  TouchableOpacity, Animated, Easing, Dimensions, StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Leaf } from 'lucide-react-native';
import { palette, type, spacing, font, border } from '@/lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark';
interface ThemeCtx {
  mode: ThemeMode;
  toggle: () => void;
  colors: typeof palette & {
    bg: string; surface: string; text: string;
    subText: string; border: string; borderDark: string;
  };
}
const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) {
    return {
      mode: 'light' as ThemeMode,
      toggle: () => {},
      colors: {
        ...palette,
        bg: palette.bone, surface: palette.chalk,
        text: palette.ink, subText: palette.mist,
        border: palette.hair, borderDark: palette.hairLight,
      },
    };
  }
  return c;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light');

  const colors = {
    ...palette,
    bg:         mode === 'light' ? palette.bone        : palette.darkBg,
    surface:    mode === 'light' ? palette.chalk       : palette.darkSurface,
    text:       mode === 'light' ? palette.ink         : palette.darkText,
    subText:    mode === 'light' ? palette.mist        : palette.darkMist,
    border:     mode === 'light' ? palette.hair        : palette.darkBorder,
    borderDark: palette.hairLight,
  };

  return <Ctx.Provider value={{ mode, toggle, colors }}>{children}</Ctx.Provider>;
}

// ─────────────────────────────────────────────────────────────────
// SPLASH OVERLAY  — animated app-open screen
// ─────────────────────────────────────────────────────────────────

export function SplashOverlay({ visible }: { visible: boolean }) {
  const fadeOut  = useRef(new Animated.Value(1)).current;
  const leafScale = useRef(new Animated.Value(0.4)).current;
  const leafOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY   = useRef(new Animated.Value(16)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  // Entry animation on mount
  useEffect(() => {
    Animated.sequence([
      // 1. Leaf pops in
      Animated.parallel([
        Animated.spring(leafScale,   { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 10 }),
        Animated.timing(leafOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // 2. Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleY,       { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
      ]),
      // 3. Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // Exit animation when app is ready
  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible && (fadeOut as any)._value === 0) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.splashContainer, { opacity: fadeOut }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Warm background gradient feel — using layered views */}
      <View style={styles.splashBg} />
      <View style={styles.splashCircle1} />
      <View style={styles.splashCircle2} />

      {/* Logo area */}
      <View style={styles.splashContent}>
        <Animated.View style={[styles.splashIconWrap, { transform: [{ scale: leafScale }], opacity: leafOpacity }]}>
          <Leaf size={40} color={palette.chalk} fill={palette.chalk} strokeWidth={1} />
        </Animated.View>

        <Animated.Text style={[styles.splashTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          NOURISH
        </Animated.Text>

        <Animated.Text style={[styles.splashTag, { opacity: tagOpacity }]}>
          INTELLIGENT DIETARY SYSTEMS
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <Animated.View style={[styles.splashDots, { opacity: tagOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}

function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRESS SCALE — spring press feedback
// ─────────────────────────────────────────────────────────────────

export function PressScale({
  children, onPress, style, scale = 0.96, disabled,
}: {
  children: ReactNode; onPress?: () => void;
  style?: StyleProp<ViewStyle>; scale?: number; disabled?: boolean;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(anim, { toValue: scale, useNativeDriver: true, speed: 40, bounciness: 2 }).start();
  }, [anim, scale]);

  const pressOut = useCallback(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [anim]);

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANIMATED BAR — fills from 0 to value on mount
// ─────────────────────────────────────────────────────────────────

export function AnimatedBar({
  value, color, track, delay = 0,
}: { value: number; color: string; track?: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: Math.max(0, Math.min(1, value)),
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 10);
    return () => clearTimeout(t);
  }, [value, delay]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track ?? colors.border, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, width, backgroundColor: color }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SKELETON CARD — shimmer placeholder
// ─────────────────────────────────────────────────────────────────

import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing as REasing } from 'react-native-reanimated';

export function SkeletonCard({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.4, { duration: 800, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View style={[{ height, borderRadius: 16, backgroundColor: colors.border, marginBottom: 12 }, animatedStyle, style]} />
  );
}

// ─────────────────────────────────────────────────────────────────
// TOAST — slide-up notification
// ─────────────────────────────────────────────────────────────────

const ToastCtx = createContext<{ show: (msg: string, type?: 'success' | 'error' | 'info', action?: { label: string, onPress: () => void }) => void } | null>(null);

export function useToast() {
  const c = useContext(ToastCtx);
  return c ?? { show: () => {} };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info', action?: { label: string, onPress: () => void } } | null>(null);
  const anim    = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<any>(null);

  const show = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success', action?: { label: string, onPress: () => void }) => {
    setToast({ msg, type, action });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    Animated.parallel([
      Animated.spring(anim,    { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const duration = action ? 6000 : 2500;
    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(anim,    { toValue: 100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, duration);
  }, []);

  const bgColor =
    toast?.type === 'success' ? palette.sageDeep :
    toast?.type === 'error'   ? palette.crimson   :
    palette.slate;

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[styles.toastWrap, {
            backgroundColor: bgColor,
            transform: [{ translateY: anim }],
            opacity,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }]}
          pointerEvents={toast.action ? 'auto' : 'none'}
        >
          <Text style={[styles.toastText, { flex: 1 }]}>{toast.msg}</Text>
          {toast.action && (
            <TouchableOpacity onPress={toast.action.onPress} style={{ marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: palette.chalk, fontFamily: font.sansBold, fontSize: 12 }}>{toast.action.label}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// EXISTING COMPONENTS
// ─────────────────────────────────────────────────────────────────

export function BrutalPanel({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const { colors, mode } = useTheme();
  const isDark = dark ?? mode === 'dark';
  return (
    <View style={[{
      backgroundColor: isDark ? palette.darkSurface : palette.chalk,
      borderRadius: 18,
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
      padding: spacing[4],
    }, style]}>
      {children}
    </View>
  );
}

import { LinearGradient } from 'expo-linear-gradient';

export function GlassPanel({ children, style, intensity = 70, gradient = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; intensity?: number; gradient?: boolean }) {
  const { mode } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View style={[{
        backgroundColor: mode === 'dark' ? 'rgba(28,25,23,0.85)' : 'rgba(250,250,247,0.85)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        padding: spacing[4],
      } as any, style]}>
        {children}
      </View>
    );
  }
  return (
    <View style={[{
      borderRadius: 18,
      borderWidth: 1,
      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.4)',
      overflow: 'hidden',
    }, style]}>
      <BlurView intensity={intensity} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      {gradient && (
        <LinearGradient
          colors={mode === 'dark' ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={{ padding: spacing[4] }}>{children}</View>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: { icon: any, title: string, message: string, actionLabel?: string, onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing[6], opacity: 0.8, marginTop: spacing[4] }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] }}>
        <Icon size={40} color={colors.subText} strokeWidth={1.5} />
      </View>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[6], maxWidth: 280 }]}>{message}</Text>
      {actionLabel && onAction && (
        <BrutalButton variant="sage" onPress={onAction}>{actionLabel}</BrutalButton>
      )}
    </View>
  );
}

export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: any }) {
  const { colors } = useTheme();
  return <Text style={[type.label, { color: color ?? colors.subText }, style]}>{children}</Text>;
}

export function BrutalButton({
  children, onPress, variant = 'dark', style, disabled,
}: {
  children: ReactNode; onPress?: () => void;
  variant?: 'dark' | 'light' | 'sage' | 'outline';
  style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'dark'    ? palette.ink      :
    variant === 'light'   ? palette.chalk    :
    variant === 'sage'    ? palette.sageDeep :
    colors.surface;
  const fg = variant === 'light' || variant === 'outline' ? palette.ink : palette.chalk;
  const bd = variant === 'outline' ? palette.ink : bg;

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[{
        backgroundColor: disabled ? palette.mist2 : bg,
        borderRadius: 12,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: bd,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        shadowColor: palette.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: disabled || variant === 'outline' ? 0 : 0.12,
        shadowRadius: 4,
        elevation: disabled || variant === 'outline' ? 0 : 2,
      } as ViewStyle, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {typeof children === 'string'
          ? <Text style={[type.label, { color: fg }]}>{children}</Text>
          : children}
      </View>
    </PressScale>
  );
}

export function Divider({ color }: { color?: string }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: color ?? colors.border, marginVertical: spacing[3] }} />;
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const { colors } = useTheme();
  const bg =
    tone === 'success' ? palette.sageDeep :
    tone === 'warning' ? palette.amberDeep :
    tone === 'danger'  ? palette.crimson  :
    colors.surface;
  const fg = tone === 'neutral' ? palette.ink : palette.chalk;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={[type.monoBold, { color: fg, fontSize: 9 }]}>{children}</Text>
    </View>
  );
}

export function Bar({ value, color, track }: { value: number; color: string; track?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 7, borderRadius: 4, backgroundColor: track ?? colors.border, overflow: 'hidden' }}>
      <View style={{ height: 7, borderRadius: 4, width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: color }} />
    </View>
  );
}

export function StatBlock({ value, label, color }: { value: ReactNode; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: spacing[3] }}>
      <Text style={[type.h1, { color: color ?? colors.text }]}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export function SectionHeader({ title, subtitle, colors: colorsOverride }: { title: string; subtitle?: string; colors?: any }) {
  const theme = useTheme();
  const colors = colorsOverride ?? theme.colors;
  return (
    <View style={{ marginBottom: spacing[3], borderLeftWidth: 3, borderLeftColor: palette.sageDeep, paddingLeft: spacing[3] }}>
      <Text style={[type.h2, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>{subtitle}</Text>}
    </View>
  );
}

export function Loader() {
  const { colors } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
      <Animated.View style={{
        transform: [{ rotate: spin }],
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2.5, borderColor: colors.border, borderTopColor: palette.sageDeep,
      }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Splash
  splashContainer: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sageDeep,
  },
  splashBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.sageDeep,
  },
  splashCircle1: {
    position: 'absolute',
    width: SCREEN_W * 1.4,
    height: SCREEN_W * 1.4,
    borderRadius: SCREEN_W * 0.7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -SCREEN_W * 0.5,
    left: -SCREEN_W * 0.2,
  },
  splashCircle2: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_W,
    borderRadius: SCREEN_W * 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -SCREEN_W * 0.3,
    right: -SCREEN_W * 0.2,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  splashTitle: {
    fontFamily: font.sansBold,
    fontSize: 24,
    color: palette.chalk,
    letterSpacing: 10,
    marginBottom: 12,
  },
  splashTag: {
    fontFamily: font.sans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  splashDots: {
    position: 'absolute',
    bottom: 60,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  // Toast
  toastWrap: {
    position: 'absolute',
    bottom: 96,
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    zIndex: 9999,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: palette.chalk,
    fontFamily: font.sansBold,
    fontSize: 14,
  },
});
