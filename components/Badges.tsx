import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';
import { palette, type } from '@/lib/theme';
import { useTheme } from './ui';

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
    <View style={[styles.badgeBase, { backgroundColor: bg }]}>
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
    <View style={[styles.badgeBase, { backgroundColor: bg, paddingHorizontal: padH, paddingVertical: padV }]}>
      {Icon && (React.isValidElement(Icon) ? Icon : <Icon size={size === 'sm' ? 10 : 12} color={fg} strokeWidth={2.4} style={{ marginRight: 4 }} />)}
      <Text style={[type.monoBold, { color: fg, fontSize: fSize }]}>{label}</Text>
    </View>
  );
}

export function ProBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.proBadgeWrap, style]}>
      <Crown size={12} color={palette.amberDeep} strokeWidth={2.5} />
      <Text style={styles.proBadgeText}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  proBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proBadgeText: {
    fontFamily: type.monoBold.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: palette.amberDeep,
    letterSpacing: 0.5,
  },
});
