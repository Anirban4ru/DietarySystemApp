import React, { useEffect, useState, useRef, ReactNode } from 'react';
import {
  Animated,
  AccessibilityInfo,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
  StyleSheet,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { hapticTap, hapticHeavy, hapticSelection } from '@/lib/haptics';
import { palette } from '@/lib/theme';

// ─────────────────────────────────────────────────────────────────
// REDUCED MOTION HOOK
// ─────────────────────────────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReducedMotion(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

// ─────────────────────────────────────────────────────────────────
// PRESSABLE SCALE — Spring Press Feedback (120–180ms) with 44x44 target
// ─────────────────────────────────────────────────────────────────

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  hitSlop?: any;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link' | 'checkbox' | 'radio' | 'switch';
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    busy?: boolean;
    expanded?: boolean;
  };
  testID?: string;
}

export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  scale = 0.96,
  disabled = false,
  haptic = 'selection',
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (haptic !== 'none') {
      if (haptic === 'light') hapticTap();
      else if (haptic === 'medium') hapticTap();
      else if (haptic === 'heavy') hapticHeavy();
      else hapticSelection();
    }

    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: scale,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    if (!reducedMotion) {
      Animated.spring(anim, {
        toValue: 1,
        speed: 24,
        bounciness: 6,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop ?? { top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...accessibilityState }}
      testID={testID}
      style={[{ minHeight: 44, minWidth: 44, justifyContent: 'center' }, style]}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────
// FADE IN STAGGER — 180–280ms entrance for list items & cards
// ─────────────────────────────────────────────────────────────────

interface FadeInStaggerProps {
  children: ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInStagger({
  children,
  index = 0,
  delay = 0,
  style,
}: FadeInStaggerProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 16)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const calculatedDelay = delay + Math.min(index * 45, 240);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: calculatedDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: calculatedDelay,
        speed: 18,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, delay, reducedMotion, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PROGRESS RING — SVG Circular Progress Indicator
// ─────────────────────────────────────────────────────────────────

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  animated?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color = palette.sageDeep,
  trackColor = palette.paper,
  children,
  animated = true,
}: ProgressRingProps) {
  const reducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const anim = useRef(new Animated.Value(reducedMotion || !animated ? clampedProgress : 0)).current;

  useEffect(() => {
    if (reducedMotion || !animated) {
      anim.setValue(clampedProgress);
      return;
    }

    Animated.timing(anim, {
      toValue: clampedProgress,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [clampedProgress, reducedMotion, animated, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      {children && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          {children}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ANIMATED COUNTER — Smooth Numeric Transition
// ─────────────────────────────────────────────────────────────────

interface AnimatedCounterProps {
  value: number;
  formatter?: (val: number) => string;
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
}

export function AnimatedCounter({
  value,
  formatter = (v) => Math.round(v).toString(),
  style,
  textStyle,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animValue = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    const listenerId = animValue.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    Animated.timing(animValue, {
      toValue: value,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [value, animValue]);

  return (
    <View style={style}>
      <Animated.Text style={textStyle}>{formatter(displayValue)}</Animated.Text>
    </View>
  );
}
