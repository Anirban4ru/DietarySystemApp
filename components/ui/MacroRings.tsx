import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Reanimated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/components/ui';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

interface RingProps {
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  center: number;
}

function Ring({ radius, strokeWidth, progress, color, trackColor, center }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - circumference * animatedProgress.value;
    return {
      strokeDashoffset,
    };
  });

  return (
    <G rotation="-90" origin={`${center}, ${center}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
      />
    </G>
  );
}

interface MacroRingsProps {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  proteinColor: string;
  carbsColor: string;
  fatColor: string;
  size?: number;
}

export function MacroRings({
  proteinPct,
  carbsPct,
  fatPct,
  proteinColor,
  carbsColor,
  fatColor,
  size = 180,
}: MacroRingsProps) {
  const { colors } = useTheme();
  
  const strokeWidth = 14;
  const gap = 2;

  const center = size / 2;
  const r1 = (size - strokeWidth) / 2;
  const r2 = r1 - strokeWidth - gap;
  const r3 = r2 - strokeWidth - gap;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Ring radius={r1} strokeWidth={strokeWidth} progress={proteinPct} color={proteinColor} trackColor={colors.border} center={center} />
        <Ring radius={r2} strokeWidth={strokeWidth} progress={carbsPct} color={carbsColor} trackColor={colors.border} center={center} />
        <Ring radius={r3} strokeWidth={strokeWidth} progress={fatPct} color={fatColor} trackColor={colors.border} center={center} />
      </Svg>
    </View>
  );
}
