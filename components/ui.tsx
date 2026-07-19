import { ReactNode, createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform, TouchableOpacity, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font, border } from '@/lib/theme';

// Dark mode context
type ThemeMode = 'light' | 'dark';
interface ThemeCtx {
  mode: ThemeMode;
  toggle: () => void;
  colors: typeof palette & {
    bg: string;
    surface: string;
    text: string;
    subText: string;
    border: string;
    borderDark: string;
  };
}
const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) {
    // fallback
    return {
      mode: 'light' as ThemeMode,
      toggle: () => {},
      colors: { ...palette, bg: palette.bone, surface: palette.chalk, text: palette.ink, subText: palette.mist, border: palette.hair, borderDark: palette.hairLight },
    };
  }
  return c;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));
  const colors = {
    ...palette,
    bg: mode === 'light' ? palette.bone : palette.darkBg,
    surface: mode === 'light' ? palette.chalk : palette.darkSurface,
    text: mode === 'light' ? palette.ink : palette.darkText,
    subText: mode === 'light' ? palette.mist : palette.darkMist,
    border: mode === 'light' ? palette.hair : palette.darkBorder,
    borderDark: palette.hairLight,
  };
  return <Ctx.Provider value={{ mode, toggle, colors }}>{children}</Ctx.Provider>;
}

// Brutalist panel — sharp corners, thick borders, offset shadow
export function BrutalPanel({ children, style, dark }: { children: ReactNode; style?: ViewStyle; dark?: boolean }) {
  const { colors, mode } = useTheme();
  const isDark = dark ?? mode === 'dark';
  return (
    <View
      style={[
        {
          backgroundColor: isDark ? palette.darkSurface : palette.chalk,
          borderRadius: 16,
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
          padding: spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Glassmorphism overlay — frosted glass with brutalist frame
export function GlassPanel({ children, style, intensity = 80 }: { children: ReactNode; style?: ViewStyle; intensity?: number }) {
  const { mode } = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            backgroundColor: mode === 'dark' ? 'rgba(22,22,22,0.7)' : 'rgba(250,250,247,0.75)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            padding: spacing[4],
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <View style={[{ borderRadius: 16, borderWidth: 1, borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }, style]}>
      <BlurView intensity={intensity} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={{ padding: spacing[4] }}>{children}</View>
    </View>
  );
}

export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: any }) {
  const { colors } = useTheme();
  return <Text style={[type.label, { color: color ?? colors.subText }, style]}>{children}</Text>;
}

export function BrutalButton({
  children,
  onPress,
  variant = 'dark',
  style,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'dark' | 'light' | 'sage' | 'outline';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'dark' ? palette.ink :
    variant === 'light' ? palette.chalk :
    variant === 'sage' ? palette.sageDeep :
    colors.surface;
  const fg = variant === 'light' || variant === 'outline' ? palette.ink : palette.chalk;
  const bd = variant === 'outline' ? palette.ink : bg;

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        {
          backgroundColor: disabled ? palette.mist2 : bg,
          borderRadius: 12,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: bd,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled || variant === 'outline' ? 0 : 0.15,
          shadowRadius: 4,
          elevation: disabled || variant === 'outline' ? 0 : 3,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? <Text style={[type.label, { color: fg }]}>{children}</Text> : children}
    </TouchableOpacity>
  );
}

export function Divider({ color }: { color?: string }) {
  const { colors } = useTheme();
  return <View style={{ height: border.thick, backgroundColor: color ?? colors.border, marginVertical: spacing[3] }} />;
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const { colors } = useTheme();
  const bg = tone === 'success' ? palette.sageDeep : tone === 'warning' ? palette.amberDeep : tone === 'danger' ? palette.crimson : colors.surface;
  const fg = tone === 'neutral' ? palette.ink : palette.chalk;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={[type.monoBold, { color: fg, fontSize: 10 }]}>{children}</Text>
    </View>
  );
}

export function Bar({ value, color, track }: { value: number; color: string; track?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track ?? palette.paper, overflow: 'hidden' }}>
      <View style={{ height: 8, borderRadius: 4, width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: color }} />
    </View>
  );
}

export function StatBlock({ value, label, color }: { value: ReactNode; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: border.md, borderColor: colors.border, padding: spacing[3] }}>
      <Text style={[type.h1, { color: color ?? colors.text }]}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export function SectionHeader({ title, subtitle, colors: colorsOverride }: { title: string; subtitle?: string; colors?: any }) {
  const theme = useTheme();
  const colors = colorsOverride ?? theme.colors;
  return (
    <View style={{ marginBottom: spacing[3], borderLeftWidth: 4, borderLeftColor: palette.sageDeep, paddingLeft: spacing[3] }}>
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
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
      <Animated.View style={{ transform: [{ rotate: spin }], width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: colors.subText, borderTopColor: 'transparent' }} />
    </View>
  );
}
