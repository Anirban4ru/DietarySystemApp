import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Lock, Crown, ChevronRight } from 'lucide-react-native';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, SurfaceCard, PrimaryAction, ProBadge } from './ui';
import { usePro, ProEntitlement } from '@/lib/hooks';

interface FeatureGateProps {
  feature: ProEntitlement;
  title: string;
  description: string;
  preview?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function FeatureGate({
  feature,
  title,
  description,
  preview,
  children,
  style,
  compact = false,
}: FeatureGateProps) {
  const { colors, mode } = useTheme();
  const { hasEntitlement, openPaywallFor } = usePro();

  if (hasEntitlement(feature)) {
    return <>{children}</>;
  }

  const isDark = mode === 'dark';

  if (compact) {
    return (
      <SurfaceCard style={[styles.compactCard, style]} variant="subtle">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.lockCircle, { backgroundColor: isDark ? '#2C2216' : '#FEF3C7' }]}>
              <Lock size={16} color={palette.amberDeep} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>{title}</Text>
                <ProBadge />
              </View>
              <Text style={[type.bodySm, { color: colors.subText }]} numberOfLines={1}>
                {description}
              </Text>
            </View>
          </View>
          <PrimaryAction
            label="Unlock"
            onPress={() => openPaywallFor(feature)}
            variant="sage"
            style={{ minHeight: 36, paddingHorizontal: 12 }}
          />
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={[styles.gateCard, style]} variant="elevated">
      {/* Top Header Badge */}
      <View style={styles.gateHeader}>
        <View style={styles.proPill}>
          <Crown size={13} color={palette.amberDeep} />
          <Text style={styles.proPillText}>NOURISH+ PRO FEATURE</Text>
        </View>
        <Lock size={18} color={palette.amberDeep} strokeWidth={2.2} />
      </View>

      <Text style={[type.h2, { color: colors.text, marginTop: 10 }]}>{title}</Text>
      <Text style={[type.body, { color: colors.subText, marginTop: 4, lineHeight: 22 }]}>
        {description}
      </Text>

      {/* Feature Preview Area */}
      {preview && (
        <View style={[styles.previewWrap, { backgroundColor: colors.paperBg, borderColor: colors.border }]}>
          {preview}
        </View>
      )}

      {/* Action */}
      <View style={{ marginTop: spacing[4] }}>
        <PrimaryAction
          label={`Unlock ${title}`}
          onPress={() => openPaywallFor(feature)}
          icon={Crown}
          variant="sage"
        />
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  gateCard: {
    padding: spacing[5],
    borderRadius: 20,
    marginVertical: spacing[3],
  },
  compactCard: {
    padding: spacing[3],
    borderRadius: 16,
    marginVertical: spacing[2],
  },
  gateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.amber + '40',
  },
  proPillText: {
    fontSize: 10,
    fontFamily: font.sansBold,
    color: palette.amberDeep,
    letterSpacing: 0.8,
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: {
    marginTop: spacing[4],
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing[3],
    overflow: 'hidden',
  },
});
