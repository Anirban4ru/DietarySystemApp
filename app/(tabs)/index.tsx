import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ScanLine, Receipt, CalendarDays, ShoppingBag, Leaf,
  Flame, ChefHat, Crown, AlertTriangle, ArrowRight,
  Plus, CheckCircle2, ChevronRight, Droplet, Utensils,
  Trophy, Target, ShieldCheck, Clock,
} from 'lucide-react-native';
import { hapticTap, hapticHeavy } from '@/lib/haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import {
  useTheme, SurfaceCard, MetricCard, StatusBadge,
  FreshnessBadge, PrimaryAction, SecondaryAction, IconButton,
  ProBadge, QuickActionGrid, QuickActionItem, TimelineRow,
  useToast, Bar,
} from '@/components/ui';
import { ProgressRing, PressableScale, FadeInStagger } from '@/components/motion';
import { usePro, useInventory, useImpact, useXp, useProfile, useMealPlan, useWeeklyGoals } from '@/lib/hooks';
import { computeLevel, computeWeeklyGoal } from '@/lib/features';
import { summarizeImpact } from '@/lib/impact';
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
  const { goals } = useWeeklyGoals();
  const { profile } = useProfile();
  const { plan } = useMealPlan();

  const summary = useMemo(() => summarizeImpact(log), [log]);
  const levelInfo = useMemo(() => computeLevel(xp), [xp]);
  const weeklyGoal = useMemo(() => computeWeeklyGoal(log, goals.target_meals, goals.target_co2e), [log, goals]);

  const [refreshing, setRefreshing] = useState(false);
  const [waterMl, setWaterMl] = useState(1250);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticTap();
    if (reloadInventory) await reloadInventory();
    setRefreshing(false);
  };

  // Expiring items (within 3 days)
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
    return { score, label: 'Urgent Action', sub: 'Items need immediate rescue recipes' };
  }, [items]);

  // Primary rescue candidate
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

  // User name strictly from profile — never default to placeholder names
  const userName = useMemo(() => {
    if (profile?.name && profile.name.trim().length > 0) {
      return profile.name.trim().split(' ')[0];
    }
    return '';
  }, [profile]);

  // Clean Quick Action Buttons
  const quickActions: QuickActionItem[] = [
    {
      id: 'scan_food',
      label: 'Scan Food',
      icon: ScanLine,
      accent: palette.royalGreen,
      onPress: () => router.push('/scan'),
    },
    {
      id: 'scan_receipt',
      label: 'Scan Receipt',
      icon: Receipt,
      accent: palette.goldenDays,
      onPress: () => router.push('/scan'),
    },
    {
      id: 'plan_meals',
      label: 'Meal Plan',
      icon: CalendarDays,
      accent: palette.royalGreen,
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
    hapticTap();
    setWaterMl((prev) => {
      const next = Math.min(3000, prev + 250);
      if (next === 2500) {
        addXp(20);
        toast.show('Daily Hydration Target Reached! +20 XP', 'success');
      }
      return next;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.royalGreen} />}
      >
        {/* ── 1. OPULENT EDITORIAL HEADER ── */}
        <FadeInStagger index={0}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>
                {formattedDate.toUpperCase()}
              </Text>
              <Text style={[styles.headerGreeting, { color: colors.text }]}>
                {userName ? `${greeting}, ${userName}` : greeting}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
                Precision Culinary &amp; Dietary Intelligence
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => (isPro ? router.push('/(tabs)/profile') : openPaywallFor())}
              style={{ paddingTop: 6 }}
              accessibilityRole="button"
              accessibilityLabel={isPro ? 'Pro VIP account active' : 'Unlock Nourish Pro'}
            >
              {isPro ? (
                <ProBadge />
              ) : (
                <View style={styles.upgradePill}>
                  <Crown size={12} color="#02332D" />
                  <Text style={styles.upgradePillText}>NOURISH PRO</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </FadeInStagger>

        {/* ── 2. UNIFIED ROYAL EXECUTIVE SUMMARY CARD ── */}
        <FadeInStagger index={1}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push('/(tabs)/impact')}
            accessibilityRole="button"
            accessibilityLabel="View Impact and Level Progress"
          >
            <SurfaceCard style={styles.executiveCard} variant="elevated">
              <View style={styles.executiveRow}>
                {/* Left: Freshness Gauge */}
                <View style={styles.gaugeColumn}>
                  <ProgressRing
                    size={84}
                    strokeWidth={7}
                    progress={kitchenHealth.score / 100}
                    color={kitchenHealth.score >= 70 ? palette.royalGreen : palette.goldenDays}
                    trackColor={colors.paperBg}
                  >
                    <Text style={[styles.gaugeScore, { color: colors.text }]}>
                      {kitchenHealth.score}
                    </Text>
                    <Text style={styles.gaugeLabel}>FRESHNESS</Text>
                  </ProgressRing>
                  <Text style={[styles.gaugeStatusText, { color: colors.text }]}>
                    {kitchenHealth.label}
                  </Text>
                </View>

                {/* Vertical Divider */}
                <View style={[styles.executiveDivider, { backgroundColor: colors.border }]} />

                {/* Right: Streak & Level & XP */}
                <View style={styles.statsColumn}>
                  {/* Streak & Level Row */}
                  <View style={styles.streakLevelRow}>
                    <View style={styles.streakBadge}>
                      <Flame size={14} color="#BF9861" fill="#BF9861" />
                      <Text style={styles.streakBadgeText}>
                        {summary.streakDays > 0 ? `${summary.streakDays}D STREAK` : 'START STREAK'}
                      </Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Trophy size={13} color="#02332D" strokeWidth={2.4} />
                      <Text style={styles.levelBadgeText}>
                        LVL {levelInfo.current.level}
                      </Text>
                    </View>
                  </View>

                  {/* Level Title */}
                  <Text style={[styles.levelTitle, { color: colors.text }]} numberOfLines={1}>
                    {levelInfo.current.title}
                  </Text>

                  {/* XP Progress Bar */}
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.xpTextRow}>
                      <Text style={[styles.xpSub, { color: colors.subText }]}>XP PROGRESS</Text>
                      <Text style={[styles.xpValue, { color: colors.text }]}>
                        {xp} / {levelInfo.next ? `${levelInfo.next.xpThreshold}` : 'MAX'}
                      </Text>
                    </View>
                    <Bar value={levelInfo.progress} color={palette.goldenDays} track={colors.border} />
                  </View>

                  {/* Weekly Rescues Pill */}
                  <View style={styles.weeklyRescuesRow}>
                    <Target size={12} color="#BF9861" />
                    <Text style={styles.weeklyRescuesText}>
                      {weeklyGoal.mealsThisWeek} of {weeklyGoal.targetMeals} weekly meals rescued
                    </Text>
                  </View>
                </View>
              </View>
            </SurfaceCard>
          </TouchableOpacity>
        </FadeInStagger>

        {/* ── 3. SPATIAL QUICK ACTIONS ── */}
        <FadeInStagger index={2}>
          <View style={styles.quickActionContainer}>
            <QuickActionGrid actions={quickActions} />
          </View>
        </FadeInStagger>

        {/* ── 4. FRESHNESS WATCH & RESCUE FOCUS ── */}
        <FadeInStagger index={3}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Freshness Watch</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
              <Text style={styles.sectionActionText}>VIEW PANTRY</Text>
            </TouchableOpacity>
          </View>

          {expiringItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselScroll}>
              {expiringItems.map((item) => {
                const days = daysLeft(item.expires_at);
                const isUrgent = days <= 1;
                return (
                  <SurfaceCard key={item.id} style={styles.expiringCard} variant="elevated">
                    <View style={styles.expiringTopRow}>
                      <View style={[styles.urgencyBadge, { backgroundColor: isUrgent ? '#7F1100' : '#BF9861' }]}>
                        <Text style={styles.urgencyBadgeText}>
                          {days <= 0 ? 'EXPIRES TODAY' : `${days}D LEFT`}
                        </Text>
                      </View>
                      <Text style={[styles.expiringQty, { color: colors.subText }]}>
                        {item.quantity ? `${item.quantity} ${item.unit || ''}` : ''}
                      </Text>
                    </View>

                    <Text style={[styles.expiringName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.expiringCategory, { color: colors.subText }]}>
                      {item.category.replace('_', ' ')}
                    </Text>

                    <View style={{ marginTop: 12 }}>
                      <PrimaryAction
                        label="Rescue Recipe"
                        onPress={() => router.push('/(tabs)/recipes')}
                        icon={ChefHat}
                        variant="sage"
                        style={{ minHeight: 34, paddingHorizontal: 10 }}
                      />
                    </View>
                  </SurfaceCard>
                );
              })}
            </ScrollView>
          ) : (
            <SurfaceCard style={styles.emptyPantryCard} variant="subtle">
              <CheckCircle2 size={22} color="#02332D" strokeWidth={2} />
              <Text style={[styles.emptyPantryText, { color: colors.text }]}>
                Pantry is in peak condition. Zero items expiring in the next 3 days!
              </Text>
            </SurfaceCard>
          )}
        </FadeInStagger>

        {/* ── 5. TODAY'S CULINARY TIMELINE ── */}
        <FadeInStagger index={4}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Today&apos;s Culinary Schedule</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/plan')}>
              <Text style={styles.sectionActionText}>EDIT PLAN</Text>
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
                subtitle={matchedMeal ? 'Curated from Weekly Meal Plan' : 'Tap to select a healthy meal'}
                status={matchedMeal ? 'completed' : 'upcoming'}
                icon={Utensils}
                onPress={() => router.push('/(tabs)/plan')}
              />
            );
          })}
        </FadeInStagger>

        {/* ── 6. HYDRATION TRACKER ── */}
        <FadeInStagger index={5}>
          <SurfaceCard style={styles.hydrationCard} variant="paper">
            <View style={styles.hydrationRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.waterIconWrap}>
                  <Droplet size={18} color="#02332D" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.hydrationTitle, { color: colors.text }]}>Daily Hydration</Text>
                  <Text style={[styles.hydrationSub, { color: colors.subText }]}>{waterMl} ml / 2,500 ml target</Text>
                </View>
              </View>

              <PressableScale
                onPress={handleWaterAdd}
                style={styles.addWaterBtn}
                accessibilityLabel="Log 250ml water intake"
              >
                <Plus size={14} color="#02332D" strokeWidth={3} />
                <Text style={styles.addWaterBtnText}>+250ml</Text>
              </PressableScale>
            </View>
            <View style={{ marginTop: 10 }}>
              <Bar value={waterMl / 2500} color={palette.royalGreen} track={colors.border} />
            </View>
          </SurfaceCard>
        </FadeInStagger>
      </ScrollView>
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
  // 1. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  headerDate: {
    fontFamily: font.sansBold,
    fontSize: 11,
    color: '#BF9861', // Golden Days
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerGreeting: {
    fontFamily: font.display,
    fontSize: 28,
    fontWeight: '700' as any,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: font.sans,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  upgradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#BF9861', // Golden Days
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#BF9861',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradePillText: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: '#02332D', // Royal Green Qilin
    letterSpacing: 1.2,
  },
  // 2. Executive Card
  executiveCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    borderRadius: 20,
  },
  executiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
  },
  gaugeScore: {
    fontFamily: font.display,
    fontSize: 20,
    fontWeight: '700' as any,
  },
  gaugeLabel: {
    fontFamily: font.sansBold,
    fontSize: 7.5,
    color: '#BF9861',
    letterSpacing: 0.8,
  },
  gaugeStatusText: {
    fontFamily: font.sansBold,
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  executiveDivider: {
    width: 1,
    height: '80%',
    marginRight: 16,
  },
  statsColumn: {
    flex: 1,
  },
  streakLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(191, 152, 97, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streakBadgeText: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: '#BF9861',
    letterSpacing: 0.8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 51, 45, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: '#02332D',
    letterSpacing: 0.8,
  },
  levelTitle: {
    fontFamily: font.sansBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  xpSub: {
    fontFamily: font.sansBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  xpValue: {
    fontFamily: font.sansBold,
    fontSize: 11,
  },
  weeklyRescuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  weeklyRescuesText: {
    fontFamily: font.sansMed,
    fontSize: 11,
    color: '#BF9861',
  },
  // 3. Quick Actions
  quickActionContainer: {
    marginBottom: spacing[4],
  },
  // 4. Section Headers
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  sectionHeading: {
    fontFamily: font.sansBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  sectionActionText: {
    fontFamily: font.sansBold,
    fontSize: 11,
    color: '#02332D', // Royal Green Qilin
    letterSpacing: 1.2,
  },
  // Freshness Carousel
  carouselScroll: {
    marginBottom: spacing[4],
  },
  expiringCard: {
    width: 170,
    padding: spacing[3],
    borderRadius: 16,
    marginRight: 12,
  },
  expiringTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyBadgeText: {
    fontFamily: font.sansBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  expiringQty: {
    fontFamily: font.sansMed,
    fontSize: 10,
  },
  expiringName: {
    fontFamily: font.sansBold,
    fontSize: 14,
    marginTop: 2,
  },
  expiringCategory: {
    fontFamily: font.sans,
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  emptyPantryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: 16,
    marginBottom: spacing[4],
  },
  emptyPantryText: {
    fontFamily: font.sansMed,
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  // 6. Hydration
  hydrationCard: {
    padding: spacing[4],
    borderRadius: 18,
    marginTop: spacing[3],
  },
  hydrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 51, 45, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hydrationTitle: {
    fontFamily: font.sansBold,
    fontSize: 14,
  },
  hydrationSub: {
    fontFamily: font.sans,
    fontSize: 11,
    marginTop: 1,
  },
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BF9861', // Golden Days
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addWaterBtnText: {
    fontFamily: font.sansBold,
    fontSize: 11,
    color: '#02332D',
    marginLeft: 3,
  },
});
