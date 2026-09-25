import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, ChefHat, Check, Snowflake, HeartHandshake, Trash2 } from 'lucide-react-native';
import { palette, type, spacing, font } from '@/lib/theme';
import { SurfaceCard, FreshnessBadge, useTheme } from '@/components/ui';
import { InventoryRow } from '@/lib/types';

function daysLeft(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export interface PantryItemCardProps {
  item: InventoryRow;
  onConsume: () => void;
  onFreeze: () => void;
  onDonate: () => void;
  onDiscard: () => void;
  onTip: () => void;
  onRescue: () => void;
}

export const PantryItemCard = React.memo(function PantryItemCard({
  item,
  onConsume,
  onFreeze,
  onDonate,
  onDiscard,
  onTip,
  onRescue,
}: PantryItemCardProps) {
  const { colors } = useTheme();
  const days = daysLeft(item.expires_at);

  return (
    <SurfaceCard style={styles.itemCard} variant="elevated">
      <View style={styles.itemMainRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FreshnessBadge daysLeft={days} />
            <Text style={[type.monoBold, { color: colors.subText, fontSize: 11, textTransform: 'capitalize' }]}>
              {item.category.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold, fontSize: 16 }]}>
            {item.name}
          </Text>
          <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
            {item.quantity ? `${item.quantity} ${item.unit || ''}` : '1 package'}
          </Text>
        </View>

        {/* Tip & Rescue CTAs */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <TouchableOpacity
            onPress={onTip}
            style={[styles.tipBtn, { backgroundColor: colors.paperBg, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Storage tips for ${item.name}`}
          >
            <Info size={14} color={palette.sageDeep} />
            <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 10, marginLeft: 4 }]}>TIPS</Text>
          </TouchableOpacity>

          {days <= 3 && (
            <TouchableOpacity
              onPress={onRescue}
              style={[styles.rescuePill, { backgroundColor: '#FEF3C7' }]}
              accessibilityRole="button"
              accessibilityLabel={`Find rescue recipes for ${item.name}`}
            >
              <ChefHat size={12} color={palette.amberDeep} />
              <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 10, marginLeft: 4 }]}>RESCUE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4 Action Buttons Row: Consumed, Freeze, Donate, Discard */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onConsume}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as consumed`}
        >
          <Check size={16} color={palette.sageDeep} strokeWidth={2.4} />
          <Text style={[styles.actionBtnText, { color: palette.sageDeep }]}>Eaten</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onFreeze}
          accessibilityRole="button"
          accessibilityLabel={`Freeze ${item.name}`}
        >
          <Snowflake size={15} color="#0284C7" strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Freeze</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDonate}
          accessibilityRole="button"
          accessibilityLabel={`Donate ${item.name}`}
        >
          <HeartHandshake size={15} color={palette.amberDeep} strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: palette.amberDeep }]}>Donate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel={`Discard ${item.name}`}
        >
          <Trash2 size={15} color={palette.crimson} strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: palette.crimson }]}>Discard</Text>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 18,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  tipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
  },
  rescuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
  actionBtnText: {
    fontFamily: font.sansBold,
    fontSize: 11,
  },
});
