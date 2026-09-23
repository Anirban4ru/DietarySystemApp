import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ScanLine, Receipt, CalendarDays, ShoppingBag, Leaf,
  Flame, ChefHat, Sparkles, AlertTriangle, ArrowRight,
  Clock, Plus, CheckCircle2, ChevronRight, Droplet,
  Utensils, TrendingUp, Compass, Heart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import {
  useTheme, SurfaceCard, MetricCard, StatusBadge,
  FreshnessBadge, PrimaryAction, SecondaryAction, IconButton,
  ProBadge, QuickActionGrid, QuickActionItem, TimelineRow,
  useToast, Bar,
} from '@/components/ui';
import { ProgressRing, PressableScale, FadeInStagger } from '@/components/motion';
import { FeatureGate } from '@/components/FeatureGate';
import { usePro, useInventory, useImpact, useXp, useProfile, useMealPlan } from '@/lib/hooks';
import { computeRDA, computeTDEE } from '@/lib/rda';
import { InventoryRow } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');

function daysLeft(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function TodayScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { isPro, openPaywallFor } = usePro();
  const { items, reload: reloadInventory } = useInventory();
  const { xp, addXp } = useXp();
  const { log } = useImpact();
  const { profile } = useProfile();
  const { plan } = useMealPlan();

  const [refreshing, setRefreshing] = useState(false);
  const [waterMl, setWaterMl] = useState(1250);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reloadInventory) await reloadInventory();
    setRefreshing(false);
  };

  // Expiring items
  const expiringItems = useMemo(() => {
    return items
      .filter((i) => {
        const d = daysLeft(i.expires_at);
        return d >= 0 && d <= 3;
      })
      .sort((a, b) => daysLeft(a.expires_at) - daysLeft(b.expires_at));
  }, [items]);

  // Kitchen health score calculation (0 - 100)
  const kitchenHealth = useMemo(() => {
    if (items.length === 0) return { score: 100, label: 'Optimal', sub: 'Pantry is ready for fresh ingredients' };
    const expiredCount = items.filter((i) => daysLeft(i.expires_at) < 0).length;
    const criticalCount = items.filter((i) => {
      const d = daysLeft(i.expires_at);
      return d >= 0 && d <= 2;
    }).length;

    let score = 100 - expiredCount * 25 - criticalCount * 12;
    score = Math.max(20, Math.min(100, score));

    if (score >= 85) return { score, label: 'Optimal', sub: 'Low waste risk across all pantry items' };
    if (score >= 65) return { score, label: 'Attention Needed', sub: `${criticalCount} items require cooking this week` };
    return { score, label: 'Urgent Action', sub: 'Multiple items need immediate rescue recipes' };
  }, [items]);

  // Top recommended rescue candidate
  const primaryRescueItem: InventoryRow | null = useMemo(() => {
    if (expiringItems.length === 0) return null;
    return expiringItems[0];
  }, [expiringItems]);

  // Today's meal plan entries
  const todayDayOfWeek = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Mon=0
  }, []);

  const todayMeals = useMemo(() => {
    return plan.filter((m) => m.day_of_week === todayDayOfWeek);
  }, [plan, todayDayOfWeek]);

  // Date & Greeting
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const userName = profile?.name ? profile.name.split(' ')[0] : 'Chef';

  // Quick Action Buttons
  const quickActions: QuickActionItem[] = [
    {
      id: 'scan_food',
      label: 'Scan Food',
      icon: ScanLine,
      accent: palette.sageDeep,
      onPress: () => router.push('/scan'),
    },
    {
      id: 'scan_receipt',
      label: 'Scan Receipt',
      icon: Receipt,
      accent: palette.amberDeep,
      onPress: () => router.push('/scan'),
    },
    {
      id: 'plan_meals',
      label: 'Meal Plan',
      icon: CalendarDays,
      accent: palette.sage,
      onPress: () => router.push('/(tabs)/plan'),
    },
    {
      id: 'grocery_list',
      label: 'Smart Shop',
      icon: ShoppingBag,
      accent: palette.slate,
      onPress: () => router.push('/(tabs)/shopping'),
    },
  ];

  const handleWaterAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterMl((prev) => {
      const next = Math.min(3000, prev + 250);
      if (next === 2500) {
        addXp(20);
        toast.show('Daily Hydration Target Reached! +20 XP', 'success');
      }
      return next;
    });
  };

  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.sageDeep} />}
      >
        {/* ── HEADER ── */}
        <FadeInStagger index={0}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: palette.sageDeep, letterSpacing: 1.2, marginBottom: 2 }]}>
                {formattedDate.toUpperCase()}
              </Text>
              <Text style={[type.display, { color: colors.text }]}>
                {greeting}, {userName}
              </Text>
              <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
                Dietary System • Your intelligent kitchen companion
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => (isPro ? router.push('/(tabs)/profile') : openPaywallFor())}
              style={{ paddingTop: 4 }}
              accessibilityRole="button"
              accessibilityLabel={isPro ? 'Pro VIP account active' : 'Unlock Nourish Pro'}
            >
              {isPro ? (
                <ProBadge />
              ) : (
                <View style={[styles.upgradePill, { borderColor: palette.amber + '40', backgroundColor: '#FEF3C7' }]}>
                  <Sparkles size={12} color={palette.amberDeep} />
                  <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 10 }]}>UPGRADE</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </FadeInStagger>

        {/* ── KITCHEN HEALTH & PRIMARY RECOMMENDED ACTION HERO ── */}
        <FadeInStagger index={1}>
          <SurfaceCard style={styles.heroCard} variant="elevated">
            <View style={styles.heroTop}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text style={[type.label, { color: colors.subText }]}>PANTRY FRESHNESS INDEX</Text>
                <Text style={[type.h1, { color: colors.text, marginTop: 4 }]}>
                  {kitchenHealth.label}
                </Text>
                <Text style={[type.bodySm, { color: colors.subText, marginTop: 4, lineHeight: 18 }]}>
                  {kitchenHealth.sub}
                </Text>
              </View>

              <ProgressRing
                size={84}
                strokeWidth={7.5}
                progress={kitchenHealth.score / 100}
                color={kitchenHealth.score >= 70 ? palette.sageDeep : palette.amberDeep}
                trackColor={colors.paperBg}
              >
                <Text style={[type.h1, { color: colors.text, fontSize: 20, fontFamily: font.display }]}>
                  {kitchenHealth.score}
                </Text>
                <Text style={[type.monoBold, { color: colors.subText, fontSize: 8 }]}>SCORE</Text>
              </ProgressRing>
            </View>

            {/* ONE PRIMARY RECOMMENDED ACTION: "What should I do next?" */}
            <View style={[styles.nextActionWrap, { backgroundColor: colors.paperBg, borderColor: colors.border }]}>
              {primaryRescueItem ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={14} color={palette.amberDeep} />
                    <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 11 }]}>
                      RECOMMENDED ACTION • RESCUE FOOD
                    </Text>
                  </View>
                  <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>
                    Cook with {primaryRescueItem.name}
                  </Text>
                  <Text style={[type.bodySm, { color: colors.subText, marginTop: 2, marginBottom: 12 }]}>
                    Expires in {Math.max(1, daysLeft(primaryRescueItem.expires_at))} day{daysLeft(primaryRescueItem.expires_at) === 1 ? '' : 's'}. Turn it into a quick rescue dinner now.
                  </Text>
                  <PrimaryAction
                    label={`Make ${primaryRescueItem.name} Recipe`}
                    onPress={() => router.push('/(tabs)/recipes')}
                    icon={ChefHat}
                    variant="sage"
                  />
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Sparkles size={14} color={palette.sageDeep} />
                    <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 11 }]}>
                      RECOMMENDED ACTION • LOG MEAL
                    </Text>
                  </View>
                  <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>
                    Keep Your Weekly Meal Plan Updated
                  </Text>
                  <Text style={[type.bodySm, { color: colors.subText, marginTop: 2, marginBottom: 12 }]}>
                    Planning ahead saves an average of $65 per week and eliminates food waste.
                  </Text>
                  <PrimaryAction
                    label="Open Meal Plan"
                    onPress={() => router.push('/(tabs)/plan')}
                    icon={CalendarDays}
                    variant="sage"
                  />
                </View>
              )}
            </View>
          </SurfaceCard>
        </FadeInStagger>

        {/* ── QUICK ACTIONS GRID ── */}
        <FadeInStagger index={2}>
          <QuickActionGrid actions={quickActions} />
        </FadeInStagger>

        {/* ── EXPIRING SOON FOOD CAROUSEL ── */}
        <FadeInStagger index={3}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIndicator, { backgroundColor: palette.amberDeep }]} />
              <Text style={[type.h2, { color: colors.text }]}>Urgent Freshness Watch</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
              <Text style={[type.label, { color: palette.sageDeep, fontSize: 11 }]}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {expiringItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselScroll}>
              {expiringItems.map((item) => {
                const days = daysLeft(item.expires_at);
                return (
                  <SurfaceCard key={item.id} style={styles.expiringCard} variant="elevated">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <FreshnessBadge daysLeft={days} />
                      <Text style={[type.monoBold, { color: colors.subText, fontSize: 11 }]}>
                        {item.quantity ? `${item.quantity} ${item.unit || ''}` : ''}
                      </Text>
                    </View>
                    <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[type.bodySm, { color: colors.subText, fontSize: 11, marginTop: 2, textTransform: 'capitalize' }]}>
                      {item.category.replace('_', ' ')}
                    </Text>
                    <View style={{ marginTop: 12 }}>
                      <PrimaryAction
                        label="Rescue"
                        onPress={() => router.push('/(tabs)/recipes')}
                        icon={ChefHat}
                        variant="sage"
                        style={{ minHeight: 36, paddingHorizontal: 12 }}
                      />
                    </View>
                  </SurfaceCard>
                );
              })}
            </ScrollView>
          ) : (
            <SurfaceCard style={styles.emptyPantryCard} variant="subtle">
              <CheckCircle2 size={24} color={palette.sageDeep} strokeWidth={2} />
              <Text style={[type.bodySm, { color: colors.text, marginLeft: 10, flex: 1 }]}>
                All pantry items are in prime condition. Zero items expiring in the next 3 days!
              </Text>
            </SurfaceCard>
          )}
        </FadeInStagger>

        {/* ── TODAY'S MEAL TIMELINE ── */}
        <FadeInStagger index={4}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIndicator, { backgroundColor: palette.sageDeep }]} />
              <Text style={[type.h2, { color: colors.text }]}>Today&apos;s Meal Timeline</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/plan')}>
              <Text style={[type.label, { color: palette.sageDeep, fontSize: 11 }]}>WEEK PLAN</Text>
            </TouchableOpacity>
          </View>

          {['Breakfast', 'Lunch', 'Dinner'].map((slotTime, idx) => {
            const timeLabel = idx === 0 ? '08:30' : idx === 1 ? '13:00' : '19:30';
            const matchedMeal = todayMeals.find((m) => m.meal_type.toLowerCase() === slotTime.toLowerCase());

            return (
              <TimelineRow
                key={slotTime}
                time={timeLabel}
                title={`${slotTime}: ${matchedMeal?.recipe_name || 'Unplanned'}`}
                subtitle={matchedMeal ? 'Scheduled from Weekly Plan' : 'Tap to select a healthy meal'}
                status={matchedMeal ? 'completed' : 'upcoming'}
                icon={Utensils}
                onPress={() => router.push('/(tabs)/plan')}
              />
            );
          })}
        </FadeInStagger>

        {/* ── HYDRATION TRACKER ── */}
        <FadeInStagger index={5}>
          <SurfaceCard style={styles.hydrationCard} variant="paper">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.waterIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Droplet size={20} color="#0284C7" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>Hydration Target</Text>
                  <Text style={[type.bodySm, { color: colors.subText }]}>{waterMl} ml / 2,500 ml goal</Text>
                </View>
              </View>
              <PressableScale
                onPress={handleWaterAdd}
                style={[styles.addWaterBtn, { backgroundColor: '#0284C7' }]}
                accessibilityLabel="Log 250ml water intake"
              >
                <Plus size={16} color={palette.chalk} strokeWidth={3} />
                <Text style={[type.monoBold, { color: palette.chalk, fontSize: 11, marginLeft: 4 }]}>+250ml</Text>
              </PressableScale>
            </View>
            <View style={{ marginTop: 12 }}>
              <Bar value={waterMl / 2500} color="#0284C7" track={colors.border} />
            </View>
          </SurfaceCard>
        </FadeInStagger>

        {/* ── PRO FEATURE GATE: CLINICAL MACRO BUDGET TEASER ── */}
        <FadeInStagger index={6}>
          <FeatureGate
            feature="macro_targets"
            title="Clinical Macro Targets & Deficit Tracker"
            description="Automatic personalized breakdown of Protein, Carbs, Fats, and Fiber tailored to your age, weight, and health conditions."
            preview={
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.monoBold, { color: colors.text, fontSize: 11 }]}>PROTEIN TARGET (130g)</Text>
                  <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 11 }]}>92g logged</Text>
                </View>
                <Bar value={0.71} color={palette.sageDeep} track={colors.border} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.monoBold, { color: colors.text, fontSize: 11 }]}>DIETARY FIBER (35g)</Text>
                  <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 11 }]}>24g logged</Text>
                </View>
                <Bar value={0.68} color={palette.amberDeep} track={colors.border} />
              </View>
            }
          >
            <SurfaceCard style={{ padding: spacing[4], marginVertical: spacing[3] }}>
              <Text style={[type.h2, { color: colors.text }]}>Today&apos;s Nutrition Targets</Text>
              <Text style={[type.bodySm, { color: colors.subText, marginTop: 2, marginBottom: 12 }]}>
                Calculated according to your metabolic rate and health conditions
              </Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.monoBold, { color: colors.text, fontSize: 11 }]}>PROTEIN TARGET</Text>
                  <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 11 }]}>92g / 130g</Text>
                </View>
                <Bar value={0.71} color={palette.sageDeep} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[type.monoBold, { color: colors.text, fontSize: 11 }]}>DAILY CALORIES</Text>
                  <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 11 }]}>1,450 / 2,100 kcal</Text>
                </View>
                <Bar value={0.69} color={palette.amberDeep} />
              </View>
            </SurfaceCard>
          </FeatureGate>
        </FadeInStagger>

        {/* ── WEEKLY IMPACT & SAVINGS SUMMARY ── */}
        <FadeInStagger index={7}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sectionIndicator, { backgroundColor: palette.sageDeep }]} />
              <Text style={[type.h2, { color: colors.text }]}>Weekly Impact Footprint</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/impact')}>
              <Text style={[type.label, { color: palette.sageDeep, fontSize: 11 }]}>DETAILS</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <MetricCard
              title="MEALS RESCUED"
              value={log.filter((l) => l.event_type === 'rescue_meal').length}
              subtitle="This week"
              icon={ChefHat}
              accentColor={palette.sageDeep}
              onPress={() => router.push('/(tabs)/impact')}
            />
            <MetricCard
              title="CO2 AVOIDED"
              value={log.reduce((acc, curr) => acc + (curr.co2e_kg || 0), 0).toFixed(1)}
              unit="kg"
              subtitle="Total saved"
              icon={Leaf}
              accentColor={palette.sageDeep}
              onPress={() => router.push('/(tabs)/impact')}
            />
          </View>
        </FadeInStagger>
      </ScrollView>

      {/* ── PROMINENT FLOATING SCANNER ACTION ── */}
      <PressableScale
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push('/scan');
        }}
        style={[styles.floatingScannerBtn, { bottom: insets.bottom + 70 }]}
        accessibilityRole="button"
        accessibilityLabel="Open food and barcode scanner"
      >
        <ScanLine size={24} color={palette.chalk} strokeWidth={2.4} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  upgradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroCard: {
    padding: spacing[5],
    borderRadius: 22,
    marginBottom: spacing[4],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextActionWrap: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  sectionIndicator: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
  },
  carouselScroll: {
    marginLeft: -4,
    paddingLeft: 4,
    paddingBottom: 4,
  },
  expiringCard: {
    width: 175,
    padding: spacing[3],
    marginRight: 12,
    borderRadius: 16,
  },
  emptyPantryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: 16,
  },
  hydrationCard: {
    padding: spacing[4],
    borderRadius: 18,
    marginTop: spacing[3],
  },
  waterIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 44,
  },
  floatingScannerBtn: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
});
