import React, {
  ReactNode, createContext, useContext, useState, useEffect,
  useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ViewStyle, Platform,
  TouchableOpacity, Animated, Easing, Dimensions, StyleProp, Appearance,
  Modal, ActivityIndicator, Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticTap, hapticSuccess, hapticError } from '@/lib/haptics';
import {
  Leaf, CheckCircle2, AlertTriangle, Info, Crown,
  ChevronRight, RefreshCw, X, ShieldAlert,
} from 'lucide-react-native';
import { palette, type, spacing, font, border } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, ProgressRing, FadeInStagger, useReducedMotion } from './motion';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark';
interface ThemeCtx {
  mode: ThemeMode;
  toggle: () => void;
  colors: typeof palette & {
    bg: string; surface: string; surfaceElevated: string;
    text: string; subText: string; border: string; borderDark: string;
    paperBg: string; primaryAction: string; cardBorder: string;
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
        bg: palette.bone, surface: palette.chalk, surfaceElevated: palette.chalk,
        text: palette.ink, subText: palette.slate2,
        border: palette.hair, borderDark: palette.hairLight,
        paperBg: palette.paper, primaryAction: palette.sageDeep, cardBorder: palette.hair,
      },
    };
  }
  return c;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((val) => {
      if (val === 'dark' || val === 'light') {
        setMode(val);
      } else {
        // Default mode is strictly light mode
        setMode('light');
        AsyncStorage.setItem('theme_mode', 'light').catch(() => {});
      }
    });
  }, []);

  const toggle = () => {
    setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('theme_mode', next);
      return next;
    });
  };

  const colors = {
    ...palette,
    bg:              mode === 'light' ? palette.bone        : palette.darkBg,
    surface:         mode === 'light' ? palette.paper       : palette.darkSurface,
    surfaceElevated: mode === 'light' ? palette.chalk       : '#142C27',
    text:            mode === 'light' ? palette.ink         : palette.darkText,
    subText:         mode === 'light' ? palette.slate2      : palette.darkMist,
    border:          mode === 'light' ? 'rgba(2, 51, 45, 0.08)' : palette.darkBorder,
    borderDark:      palette.hairLight,
    paperBg:         mode === 'light' ? '#EFE8DC'           : '#0A1815',
    primaryAction:   palette.royalGreen,
    cardBorder:      mode === 'light' ? 'rgba(2, 51, 45, 0.06)' : 'rgba(218, 207, 189, 0.1)',
  };

  return <Ctx.Provider value={{ mode, toggle, colors }}>{children}</Ctx.Provider>;
}

// ─────────────────────────────────────────────────────────────────
// SPLASH OVERLAY  — animated app-open screen
// ─────────────────────────────────────────────────────────────────

export function SplashOverlay({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(true);
  const fadeOut       = useRef(new Animated.Value(1)).current;
  const crestScale    = useRef(new Animated.Value(0.6)).current;
  const crestOpacity  = useRef(new Animated.Value(0)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;
  const titleY        = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const [statusMsg, setStatusMsg] = useState('INITIALIZING BIO-WORKSPACE...');

  useEffect(() => {
    // 1. Fluid progress bar sequence
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 2. Staggered crest & typography entrance
    Animated.sequence([
      Animated.parallel([
        Animated.spring(crestScale, { toValue: 1, speed: 8, bounciness: 4, useNativeDriver: true }),
        Animated.timing(crestOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, speed: 12, bounciness: 4, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();

    // Dynamic luxury status sequence
    const t1 = setTimeout(() => setStatusMsg('CALIBRATING NUTRITIONAL ENGINE...'), 500);
    const t2 = setTimeout(() => setStatusMsg('CURATING PERSONALIZED KITCHEN...'), 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.splashContainer, { opacity: fadeOut }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Background ambient luxury aura */}
      <View style={styles.splashBg} />
      <View style={styles.splashHalo} />
      <View style={styles.splashGlowRing} />

      <View style={styles.splashContent}>
        {/* Heraldic Crest Emblem */}
        <Animated.View style={[styles.splashIconWrap, { transform: [{ scale: crestScale }], opacity: crestOpacity }]}>
          <View style={styles.splashIconInner}>
            <Leaf size={44} color={palette.goldenDays} fill={palette.goldenDays} strokeWidth={1.2} />
          </View>
        </Animated.View>

        {/* Primary Luxury Brand */}
        <Animated.Text style={[styles.splashTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          NOURISH
        </Animated.Text>

        <Animated.Text style={[styles.splashTag, { opacity: subtitleOpacity }]}>
          INTELLIGENT DIETARY SYSTEMS
        </Animated.Text>

        <Animated.Text style={[styles.splashEditorial, { opacity: subtitleOpacity }]}>
          Precision Culinary &amp; Nutritional Intelligence
        </Animated.Text>

        {/* Progress Bar Container */}
        <Animated.View style={[styles.splashProgressTrack, { opacity: subtitleOpacity }]}>
          <Animated.View style={[styles.splashProgressFill, { width: progressWidth }]} />
        </Animated.View>

        {/* Live Status Label */}
        <Animated.Text style={[styles.splashStatus, { opacity: subtitleOpacity }]}>
          {statusMsg}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRESS SCALE — legacy alias to PressableScale
// ─────────────────────────────────────────────────────────────────

export function PressScale({
  children, onPress, style, scale = 0.96, disabled, accessibilityRole, accessibilityLabel,
}: {
  children: ReactNode; onPress?: () => void;
  style?: StyleProp<ViewStyle>; scale?: number; disabled?: boolean;
  accessibilityRole?: any; accessibilityLabel?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scale={scale}
      style={style}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </PressableScale>
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
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
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

export function SkeletonCard({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.border] });

  return (
    <Animated.View style={[{ height, borderRadius: 16, backgroundColor: bg, marginBottom: 12 }, style]} />
  );
}

// ─────────────────────────────────────────────────────────────────
// TOAST — slide-up notification with haptics
// ─────────────────────────────────────────────────────────────────

type ToastMessage = { id: string; msg: string; type: 'success' | 'error' | 'info' };

const ToastCtx = createContext<{ show: (msg: string, type?: 'success' | 'error' | 'info') => void } | null>(null);

export function useToast() {
  const c = useContext(CtxToast);
  return c ?? { show: () => {} };
}
const CtxToast = ToastCtx;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [current, setCurrent] = useState<ToastMessage | null>(null);

  const anim = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const show = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setQueue((q) => [...q, { id: Math.random().toString(), msg, type }]);
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !current) {
      const next = queue[0];
      setCurrent(next);
      setQueue((q) => q.slice(1));

      if (next.type === 'error') hapticError();
      else if (next.type === 'success') hapticSuccess();
      else hapticTap();

      Animated.parallel([
        Animated.spring(anim, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 5 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const duration = Math.max(2200, next.msg.length * 50);

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim, { toValue: 100, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => setCurrent(null));
      }, duration);
    }
  }, [queue, current]);

  const bgColor =
    current?.type === 'success' ? palette.sageDeep :
    current?.type === 'error'   ? palette.crimson  :
    palette.slate;

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {current && (
        <Animated.View
          style={[styles.toastWrap, {
            backgroundColor: bgColor,
            transform: [{ translateY: anim }],
            opacity,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }]}
          pointerEvents="none"
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          {current.type === 'success' && <CheckCircle2 size={20} color={palette.chalk} strokeWidth={2.5} />}
          {current.type === 'error' && <AlertTriangle size={20} color={palette.chalk} strokeWidth={2.5} />}
          {current.type === 'info' && <Info size={20} color={palette.chalk} strokeWidth={2.5} />}
          <Text style={[styles.toastText, { flex: 1 }]}>{current.msg}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// SURFACE CARD — Warm Ivory & Paper Depth Card
// ─────────────────────────────────────────────────────────────────

interface SurfaceCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'subtle' | 'paper' | 'outline';
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function SurfaceCard({
  children,
  style,
  variant = 'elevated',
  onPress,
  accessibilityLabel,
}: SurfaceCardProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const bg =
    variant === 'paper'    ? colors.paperBg :
    variant === 'subtle'   ? (isDark ? '#191614' : '#F7F6F2') :
    variant === 'outline'  ? 'transparent' :
    colors.surfaceElevated;

  const cardContent = (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: variant === 'outline' ? colors.border : colors.cardBorder,
          padding: spacing[4],
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: variant === 'elevated' ? (isDark ? 0.28 : 0.04) : 0,
          shadowRadius: 10,
          elevation: variant === 'elevated' ? 2 : 0,
        },
        style,
      ]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel}>
        {cardContent}
      </PressableScale>
    );
  }

  return cardContent;
}

// ─────────────────────────────────────────────────────────────────
// APP HEADER — Editorial Top Bar
// ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  rightAction?: ReactNode;
}

export function AppHeader({ title, subtitle, date, rightAction }: AppHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.appHeaderRow}>
      <View style={{ flex: 1 }}>
        {date && (
          <Text style={[type.label, { color: palette.sageDeep, marginBottom: 4 }]}>
            {date}
          </Text>
        )}
        <Text style={[type.display, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && <View style={styles.headerRightWrap}>{rightAction}</View>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION HEADER — Forest Green Left-Accent Header
// ─────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  colors?: any;
}

export function SectionHeader({ title, subtitle, rightAction, colors: colorsOverride }: SectionHeaderProps) {
  const theme = useTheme();
  const colors = colorsOverride ?? theme.colors;

  return (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        <Text style={[type.h2, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[type.bodySm, { color: colors.subText, marginTop: 1 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && <View>{rightAction}</View>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// METRIC CARD — Editorial Metric Visualization
// ─────────────────────────────────────────────────────────────────

interface MetricCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function renderIcon(icon: any, defaultProps: { size?: number; color?: string; strokeWidth?: number; style?: any } = {}) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === 'function' || (typeof icon === 'object' && (icon.render || icon.$$typeof))) {
    const IconComp = icon;
    return <IconComp {...defaultProps} />;
  }
  return null;
}

export function MetricCard({
  title,
  label,
  value,
  subtitle,
  unit,
  icon: Icon,
  trend,
  trendValue,
  change,
  isPositive,
  accentColor = palette.sageDeep,
  onPress,
  style,
}: MetricCardProps) {
  const { colors } = useTheme();
  const cardTitle = label ?? title ?? '';
  const cardSubtitle = subtitle ?? change;
  const trendDir = trend ?? (isPositive !== undefined ? (isPositive ? 'up' : 'down') : undefined);

  return (
    <SurfaceCard style={[{ flex: 1 }, style]} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={[type.label, { color: colors.subText }]}>{cardTitle}</Text>
        {Icon && (
          <View style={[styles.metricIconWrap, { backgroundColor: accentColor + '18' }]}>
            {renderIcon(Icon, { size: 16, color: accentColor, strokeWidth: 2.2 })}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={[type.display, { fontSize: 28, color: colors.text }]}>{value}</Text>
        {unit && <Text style={[type.h3, { color: colors.subText }]}>{unit}</Text>}
      </View>

      {(cardSubtitle || trendValue) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {trendValue && (
            <View style={[styles.trendPill, { backgroundColor: trendDir === 'up' ? palette.sageMist : palette.crimsonMist }]}>
              <Text style={{ fontSize: 10, fontFamily: font.sansBold, color: trendDir === 'up' ? palette.sageDeep : palette.crimson }}>
                {trendDir === 'up' ? '↑ ' : '↓ '}{trendValue}
              </Text>
            </View>
          )}
          {cardSubtitle && (
            <Text style={[type.bodySm, { color: colors.subText, fontSize: 12 }]} numberOfLines={1}>
              {cardSubtitle}
            </Text>
          )}
        </View>
      )}
    </SurfaceCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRIMARY & SECONDARY ACTIONS (Strict 44x44 minimum touch target)
// ─────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: any;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  variant?: 'sage' | 'dark' | 'outline' | 'burgundy';
}

export function PrimaryAction({
  label,
  onPress,
  icon: Icon,
  loading = false,
  disabled = false,
  style,
  variant = 'sage',
}: ActionButtonProps) {
  const bg =
    disabled             ? palette.mist2 :
    variant === 'sage'   ? palette.sageDeep :
    variant === 'burgundy' ? palette.crimson :
    palette.ink;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionBase,
        { backgroundColor: bg },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.chalk} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {renderIcon(Icon, { size: 18, color: palette.chalk, strokeWidth: 2.4 })}
          <Text style={[type.label, { color: palette.chalk, fontSize: 12 }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function SecondaryAction({
  label,
  onPress,
  icon: Icon,
  disabled = false,
  style,
}: ActionButtonProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionBase,
        {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {renderIcon(Icon, { size: 18, color: colors.text, strokeWidth: 2.2 })}
        <Text style={[type.label, { color: colors.text, fontSize: 12 }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────────
// ICON BUTTON — 44x44 points accessible control
// ─────────────────────────────────────────────────────────────────

interface IconButtonProps {
  icon: any;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 20,
  color,
  bg,
  style,
  disabled = false,
}: IconButtonProps) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.text;
  const bgColor = bg ?? colors.surface;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconButtonBase,
        { backgroundColor: bgColor, borderColor: colors.border },
        style,
      ]}
    >
      {renderIcon(Icon, { size, color: iconColor, strokeWidth: 2 })}
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATUS & FRESHNESS BADGES
// ─────────────────────────────────────────────────────────────────

export function FreshnessBadge({ daysLeft }: { daysLeft: number }) {
  let label = 'Stable';
  let tone: 'success' | 'warning' | 'danger' = 'success';

  if (daysLeft <= 0) {
    label = 'Expired';
    tone = 'danger';
  } else if (daysLeft === 1) {
    label = 'Tomorrow';
    tone = 'danger';
  } else if (daysLeft <= 3) {
    label = `${daysLeft}d left`;
    tone = 'warning';
  } else if (daysLeft <= 7) {
    label = `${daysLeft}d left`;
    tone = 'success';
  } else {
    label = 'Fresh';
    tone = 'success';
  }

  const bg =
    tone === 'danger'  ? palette.crimsonMist :
    tone === 'warning' ? '#FEF3C7' :
    palette.sageMist;

  const fg =
    tone === 'danger'  ? palette.crimson :
    tone === 'warning' ? palette.amberDeep :
    palette.sageDeep;

  return (
    <View
      style={[styles.badgeBase, { backgroundColor: bg }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Freshness status: ${label}`}
    >
      <Text style={[type.monoBold, { color: fg, fontSize: 10 }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone,
  variant,
  size = 'md',
  icon: Icon,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: any;
}) {
  const { colors } = useTheme();
  const activeTone = tone ?? variant ?? 'neutral';

  const bg =
    activeTone === 'success' ? palette.sageMist :
    activeTone === 'warning' ? '#FEF3C7' :
    activeTone === 'danger'  ? palette.crimsonMist :
    colors.paperBg;

  const fg =
    activeTone === 'success' ? palette.sageDeep :
    activeTone === 'warning' ? palette.amberDeep :
    activeTone === 'danger'  ? palette.crimson :
    colors.text;

  const padH = size === 'sm' ? 6 : 8;
  const padV = size === 'sm' ? 2 : 4;
  const fSize = size === 'sm' ? 9 : 10;

  return (
    <View
      style={[styles.badgeBase, { backgroundColor: bg, paddingHorizontal: padH, paddingVertical: padV }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {renderIcon(Icon, { size: size === 'sm' ? 10 : 12, color: fg, strokeWidth: 2.4, style: { marginRight: 4 } })}
      <Text style={[type.monoBold, { color: fg, fontSize: fSize }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRO BADGE — Saffron VIP Badge
// ─────────────────────────────────────────────────────────────────

export function ProBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.proBadgeWrap, style]}>
      <Crown size={12} color={palette.amberDeep} strokeWidth={2.5} />
      <Text style={styles.proBadgeText}>PRO</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ERROR STATE & EMPTY STATE
// ─────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.stateCenterContainer}>
      <View style={[styles.stateIconCircle, { backgroundColor: palette.crimsonMist }]}>
        <AlertTriangle size={32} color={palette.crimson} strokeWidth={2} />
      </View>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginTop: 8, maxWidth: 300 }]}>
        {message}
      </Text>
      {onRetry && (
        <View style={{ marginTop: spacing[5], width: 180 }}>
          <PrimaryAction label={retryLabel} onPress={onRetry} icon={RefreshCw} />
        </View>
      )}
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  actionLabel,
  onAction,
}: {
  icon: any;
  title: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const bodyText = message ?? description ?? '';

  return (
    <View style={styles.stateCenterContainer}>
      <View style={[styles.stateIconCircle, { backgroundColor: colors.paperBg }]}>
        {renderIcon(Icon, { size: 34, color: colors.subText, strokeWidth: 1.8 })}
      </View>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {bodyText ? (
        <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginTop: 8, maxWidth: 300 }]}>
          {bodyText}
        </Text>
      ) : null}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing[5], minWidth: 160 }}>
          <PrimaryAction label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// CONFIRM DIALOG — Non-destructive / Destructive Modal
// ─────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, mode } = useTheme();
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.modalBackdrop}>
        <SurfaceCard style={styles.confirmCard} variant="elevated">
          <Text style={[type.h2, { color: colors.text, marginBottom: 8 }]}>{title}</Text>
          <Text style={[type.body, { color: colors.subText, lineHeight: 22, marginBottom: spacing[6] }]}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SecondaryAction label={cancelLabel} onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryAction
                label={confirmLabel}
                onPress={onConfirm}
                variant={destructive ? 'burgundy' : 'sage'}
              />
            </View>
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// TIMELINE ROW — Editorial Meal & Activity Timeline
// ─────────────────────────────────────────────────────────────────

interface TimelineRowProps {
  time: string;
  title: string;
  subtitle?: string;
  icon?: any;
  status?: 'completed' | 'active' | 'upcoming';
  onPress?: () => void;
}

export function TimelineRow({
  time,
  title,
  subtitle,
  icon: Icon,
  status = 'upcoming',
  onPress,
}: TimelineRowProps) {
  const { colors } = useTheme();

  const dotColor =
    status === 'completed' ? palette.sageDeep :
    status === 'active'    ? palette.amberDeep :
    colors.border;

  return (
    <PressableScale onPress={onPress} disabled={!onPress}>
      <View style={styles.timelineRow}>
        <View style={styles.timelineTimeCol}>
          <Text style={[type.monoBold, { color: colors.subText, fontSize: 11 }]}>{time}</Text>
        </View>

        <View style={styles.timelineLineCol}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
            {status === 'completed' && <CheckCircle2 size={10} color={palette.chalk} />}
          </View>
          <View style={[styles.timelineBar, { backgroundColor: colors.border }]} />
        </View>

        <SurfaceCard style={styles.timelineContentCard} variant="subtle">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>{title}</Text>
              {subtitle && (
                <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>{subtitle}</Text>
              )}
            </View>
            {Icon && <Icon size={18} color={dotColor} strokeWidth={2} />}
          </View>
        </SurfaceCard>
      </View>
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────────
// QUICK ACTION GRID — 4-item Action Bar
// ─────────────────────────────────────────────────────────────────

export interface QuickActionItem {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
  badge?: string;
  accent?: string;
}

export function QuickActionGrid({ actions }: { actions: QuickActionItem[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.quickActionGrid}>
      {actions.map((act) => {
        const Icon = act.icon;
        const color = act.accent ?? palette.sageDeep;
        return (
          <PressableScale
            key={act.id}
            onPress={act.onPress}
            style={styles.quickActionItem}
            accessibilityLabel={act.label}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderIcon(Icon, { size: 22, color, strokeWidth: 2.2 })}
              {act.badge && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{act.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[type.monoBold, { color: colors.text, fontSize: 11, marginTop: 6, textAlign: 'center' }]}>
              {act.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY RE-EXPORTS
// ─────────────────────────────────────────────────────────────────

export function BrutalPanel({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <SurfaceCard style={style}>{children}</SurfaceCard>;
}

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

  if (typeof children === 'string') {
    if (variant === 'outline' || variant === 'light') {
      return <SecondaryAction label={children} onPress={onPress ?? (() => {})} disabled={disabled} style={style} />;
    }
    return <PrimaryAction label={children} onPress={onPress ?? (() => {})} disabled={disabled} style={style} variant={variant === 'sage' ? 'sage' : 'dark'} />;
  }

  const bg =
    variant === 'dark'    ? palette.ink      :
    variant === 'light'   ? palette.chalk    :
    variant === 'sage'    ? palette.sageDeep :
    colors.surface;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      style={[{
        backgroundColor: disabled ? palette.mist2 : bg,
        borderRadius: 14,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        minHeight: 44,
        justifyContent: 'center',
      } as ViewStyle, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {children}
      </View>
    </PressableScale>
  );
}

export function Divider({ color }: { color?: string }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: color ?? colors.border, marginVertical: spacing[3] }} />;
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <StatusBadge label={String(children)} tone={tone} />;
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
    <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: spacing[3], flex: 1 }}>
      <Text style={[type.h1, { color: color ?? colors.text }]}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
      <ActivityIndicator size="small" color={palette.sageDeep} />
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
    backgroundColor: '#02332D', // Signature Royal Green Qilin
  },
  splashBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02332D',
  },
  splashHalo: {
    position: 'absolute',
    width: SCREEN_W * 1.5,
    height: SCREEN_W * 1.5,
    borderRadius: SCREEN_W * 0.75,
    borderWidth: 1.5,
    borderColor: 'rgba(191, 152, 97, 0.12)', // Subtle Golden Days orbit
    borderStyle: 'dashed',
  },
  splashGlowRing: {
    position: 'absolute',
    width: SCREEN_W * 0.88,
    height: SCREEN_W * 0.88,
    borderRadius: SCREEN_W * 0.44,
    backgroundColor: 'rgba(191, 152, 97, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(218, 207, 189, 0.15)',
  },
  splashContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  splashIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 36,
    backgroundColor: 'rgba(2, 51, 45, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
    borderWidth: 2,
    borderColor: '#BF9861', // Golden Days
    shadowColor: '#BF9861',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  splashIconInner: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: 'rgba(191, 152, 97, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(218, 207, 189, 0.3)',
  },
  splashTitle: {
    fontFamily: font.display,
    fontSize: 32,
    color: '#BF9861', // Golden Days
    letterSpacing: 8,
    marginBottom: 8,
    fontWeight: '700' as any,
    textAlign: 'center',
  },
  splashTag: {
    fontFamily: font.sansBold,
    fontSize: 11,
    color: '#DACFBD', // White Cream
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  splashEditorial: {
    fontFamily: font.sans,
    fontSize: 12,
    color: 'rgba(218, 207, 189, 0.65)',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 36,
  },
  splashProgressTrack: {
    width: '70%',
    maxWidth: 240,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(218, 207, 189, 0.18)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  splashProgressFill: {
    height: '100%',
    backgroundColor: '#BF9861', // Golden Days
    borderRadius: 2,
  },
  splashStatus: {
    fontFamily: font.sansMed,
    fontSize: 10,
    color: 'rgba(218, 207, 189, 0.75)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
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
  // App Header
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerRightWrap: {
    marginLeft: spacing[3],
    alignItems: 'flex-end',
  },
  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[3],
  },
  sectionAccent: {
    width: 3.5,
    height: 22,
    borderRadius: 2,
    marginRight: 10,
  },
  // Action Buttons
  actionBase: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBase: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Metric Card
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  // Badges
  badgeBase: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  proBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.amber + '40',
  },
  proBadgeText: {
    fontSize: 10,
    fontFamily: font.sansBold,
    color: palette.amberDeep,
    letterSpacing: 0.5,
  },
  // States
  stateCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
  },
  stateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    padding: spacing[6],
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  timelineTimeCol: {
    width: 52,
    paddingTop: 10,
  },
  timelineLineCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    zIndex: 1,
  },
  timelineBar: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  timelineContentCard: {
    flex: 1,
    padding: spacing[3],
    borderRadius: 14,
  },
  // Quick Actions
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing[3],
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    minHeight: 70,
  },
  quickActionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: palette.crimson,
    borderRadius: 8,
    paddingHorizontal: 4,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    color: palette.chalk,
    fontSize: 9,
    fontFamily: font.sansBold,
  },
});
