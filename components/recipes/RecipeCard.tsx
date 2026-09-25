import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Leaf, Check, AlertCircle, ChefHat, Heart, ShoppingCart, Star } from 'lucide-react-native';
import { palette, type, spacing, font } from '@/lib/theme';
import { PressScale } from '@/components/ui';
import { RecipeCandidate } from '@/lib/optimizer';
import { co2eAvoidedForMeal } from '@/lib/impact';

interface RecipeCardProps {
  c: RecipeCandidate;
  index: number;
  selected: boolean;
  isFav: boolean;
  mode: string;
  onCook: () => void;
  onFav: () => void;
  onShop: () => void;
  onDetail: () => void;
  colors: any;
}

export const RecipeCard = React.memo(function RecipeCard({
  c,
  index,
  selected,
  isFav,
  mode,
  onCook,
  onFav,
  onShop,
  onDetail,
  colors,
}: RecipeCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const missingCount = c.missing.length;
  const isBestPick = index === 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isBestPick ? palette.sageDeep : colors.border }]}>
        {/* Best pick crown */}
        {isBestPick && (
          <View style={styles.bestPickBadge}>
            <Star size={10} color={palette.chalk} fill={palette.chalk} strokeWidth={0} />
            <Text style={styles.bestPickText}>BEST PICK</Text>
          </View>
        )}

        {/* Card header */}
        <View style={styles.cardHead}>
          <PressScale onPress={onDetail} style={{ flex: 1 }}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{c.name}</Text>
              <Text style={[styles.cardSub, { color: colors.subText }]}>
                {c.ingredients.length} ingredients · {Math.round(c.nutrition.kcal)} kcal · {Math.round(c.nutrition.proteinG)}g P · {Math.round(c.nutrition.carbG)}g C
              </Text>
            </View>
          </PressScale>
          <PressScale
            onPress={onFav}
            accessibilityRole="button"
            accessibilityLabel={isFav ? `Remove ${c.name} from saved favorites` : `Save ${c.name} to favorites`}
          >
            <View style={styles.favArea}>
              <Heart
                size={20}
                color={isFav ? palette.crimson : colors.subText}
                fill={isFav ? palette.crimson : 'none'}
                strokeWidth={2}
              />
            </View>
          </PressScale>
        </View>

        {/* Score bars */}
        <View style={styles.scoreGrid}>
          <ScoreBar label="Waste rescue" value={c.wasteScore} color={palette.danger} colors={colors} />
          <ScoreBar label="Nutrition fit" value={c.rdaScore} color={palette.sageDeep} colors={colors} />
          <ScoreBar label="In stock" value={c.completeness} color={palette.amberDeep} colors={colors} />
        </View>

        {/* Missing notice */}
        {missingCount > 0 && (
          <View style={[styles.noticeBox, { backgroundColor: palette.goldMist, borderColor: 'rgba(191, 152, 97, 0.35)' }]}>
            <AlertCircle size={13} color={palette.amberDeep} strokeWidth={2.5} />
            <Text style={[styles.noticeText, { color: palette.ink }]}>
              {missingCount} missing — tap SHOP to add to list
            </Text>
          </View>
        )}

        {/* CO2 line */}
        <View style={styles.co2Row}>
          <Leaf size={13} color={palette.sageDeep} strokeWidth={2.5} />
          <Text style={[styles.co2Text, { color: colors.subText }]}>
            Saves <Text style={{ color: palette.sageDeep, fontFamily: font.sansBold }}>{co2eAvoidedForMeal(c.co2eKg)} kg</Text> CO2
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <PressScale
            onPress={onCook}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${c.name} as cooked`}
            style={[styles.actionBtnWrap, { flex: 1 }] as any}
          >
            <View style={[
              styles.actionBtn,
              { backgroundColor: selected ? palette.sageDeep : palette.ink }
            ]}>
              {selected
                ? <Check size={15} color={palette.chalk} strokeWidth={2.8} />
                : <ChefHat size={15} color={palette.chalk} strokeWidth={2.5} />}
              <Text style={styles.actionBtnText}>
                {selected ? 'COOKED' : 'COOK'}
              </Text>
            </View>
          </PressScale>

          <PressScale
            onPress={onShop}
            accessibilityRole="button"
            accessibilityLabel={`Add missing ingredients for ${c.name} to shopping list`}
            style={[styles.actionBtnWrap, { flex: 1, marginLeft: 8 }] as any}
          >
            <View style={[
              styles.actionBtn,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: missingCount > 0 ? palette.sageDeep : colors.border,
              },
            ]}>
              <ShoppingCart size={15} color={missingCount > 0 ? palette.sageDeep : colors.subText} strokeWidth={2.5} />
              <Text style={[styles.actionBtnText, { color: missingCount > 0 ? palette.sageDeep : colors.subText }]}>
                SHOP {missingCount > 0 ? `(${missingCount})` : ''}
              </Text>
            </View>
          </PressScale>
        </View>
      </View>
    </Animated.View>
  );
});

function ScoreBar({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthPct = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.scoreLabel, { color: colors.subText }]}>{label}</Text>
      <View style={[styles.scoreTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.scoreFill, { width: widthPct, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[4],
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing[4],
    marginBottom: spacing[3],
    overflow: 'visible',
  },
  bestPickBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: palette.sageDeep,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bestPickText: {
    fontSize: 9,
    fontFamily: font.sansBold,
    color: palette.chalk,
    letterSpacing: 1,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: font.sansBold,
    lineHeight: 24,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: font.sans,
    marginTop: 2,
  },
  favArea: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing[3],
  },
  scoreLabel: {
    fontSize: 10,
    fontFamily: font.sansBold,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  scoreTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: 6,
    borderRadius: 3,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    marginBottom: spacing[2],
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: font.sans,
  },
  co2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[3],
  },
  co2Text: {
    fontSize: 13,
    fontFamily: font.sans,
  },
  btnRow: {
    flexDirection: 'row',
  },
  actionBtnWrap: {},
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    color: palette.chalk,
    letterSpacing: 0.5,
  },
});
