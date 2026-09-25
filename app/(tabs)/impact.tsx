import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import {
  Leaf,
  Flame,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  X,
  Zap,
  Sprout,
  Shield,
  Globe,
  DollarSign,
  Info,
  CheckCircle2,
  Users,
  Calendar,
  ArrowUpRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSuccess, hapticSelection } from '@/lib/haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import {
  useTheme,
  useToast,
  AppHeader,
  SurfaceCard,
  MetricCard,
  StatusBadge,
  PrimaryAction,
  IconButton,
  EmptyState,
} from '@/components/ui';
import { BottomSheet } from '@/components/BottomSheet';
import { PressableScale, ProgressRing } from '@/components/motion';
import { TrendChart } from '@/components/TrendChart';
import { useImpact, useDisposals, useXp, useWeeklyGoals } from '@/lib/hooks';
import { summarizeImpact, forecastDisposal, earnedBadges, BADGES } from '@/lib/impact';
import { compareHousehold, computeLevel, computeWeeklyGoal } from '@/lib/features';

export default function ImpactScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { log } = useImpact();
  const { disposals } = useDisposals();
  const { xp } = useXp();
  const { goals, update } = useWeeklyGoals();
  const [goalModal, setGoalModal] = useState(false);
  const [activeMetricInfo, setActiveMetricInfo] = useState<string | null>(null);

  const summary = useMemo(() => summarizeImpact(log), [log]);
  const forecast = useMemo(() => forecastDisposal(disposals), [disposals]);
  const earned = useMemo(() => earnedBadges(summary), [summary]);
  const level = useMemo(() => computeLevel(xp), [xp]);
  const weeklyGoal = useMemo(
    () => computeWeeklyGoal(log, goals.target_meals, goals.target_co2e),
    [log, goals]
  );
  const comparison = useMemo(
    () => compareHousehold(summary.mealsRescued, summary.totalCo2eAvoided),
    [summary]
  );

  // Financial savings estimate (₹120/meal rescued + ₹50/consumed pantry item)
  const moneySaved = useMemo(() => {
    return Math.round(summary.mealsRescued * 120 + summary.itemsConsumed * 50);
  }, [summary]);

  // Waste avoided in kg (~0.45kg per rescued meal)
  const wasteWeightSaved = useMemo(() => {
    return (summary.mealsRescued * 0.45).toFixed(1);
  }, [summary]);

  // Prepare 7-day trend chart data
  const chartData = useMemo(() => {
    const rawData = summary.co2eByDay && summary.co2eByDay.length > 0 ? summary.co2eByDay : [];
    if (rawData.length === 0) {
      return {
        points: [0.4, 0.8, 1.2, 0.9, 1.5, 2.1, 2.8],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      };
    }
    const points = rawData.map((d) => Math.max(0, d.kg));
    const labels = rawData.map((d) => d.day.slice(5)); // e.g. "09-21"
    return { points, labels };
  }, [summary.co2eByDay]);

  // 28-day disposal heatmap data
  const heatmap = useMemo(() => {
    const days: { date: string; count: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const count = disposals.filter(
        (e) => new Date(e.created_at).toISOString().slice(0, 10) === ds
      ).length;
      days.push({ date: ds, count, isToday: i === 0 });
    }
    return days;
  }, [disposals]);

  const METRIC_DEFINITIONS: Record<string, { title: string; desc: string }> = {
    co2e: {
      title: 'CO₂e Emissions Avoided',
      desc: 'Based on EPA and UNEP climate indices. Diverting organic matter from oxygen-depleted landfill environments prevents the generation of potent methane gas.',
    },
    money: {
      title: 'Financial Savings',
      desc: 'Calculated using national average grocery costs (₹120/meal rescue, ₹50/pantry item consumed before spoilage).',
    },
    waste: {
      title: 'Food Waste Avoided',
      desc: 'Estimated net weight of edible produce, dairy, and grains rescued from kitchen spoilage.',
    },
    rescued: {
      title: 'Meals Rescued',
      desc: 'Nutritious meals prepared using ingredients that were approaching their expiration threshold.',
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: 130,
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing[4],
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Impact & Progress"
          subtitle="Your environmental and financial footprint"
          rightAction={
            summary.streakDays > 0 ? (
              <View style={[styles.streakPill, { backgroundColor: 'rgba(191, 152, 97, 0.15)' }]}>
                <Flame size={15} color={palette.saffron} fill={palette.saffron} strokeWidth={2} />
                <Text style={[styles.streakText, { color: palette.saffron }]}>
                  {summary.streakDays}d streak
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* ── Level & XP Progress Card ── */}
        <SurfaceCard style={styles.levelCard}>
          <View style={styles.levelRow}>
            <ProgressRing
              progress={level.progress}
              size={56}
              strokeWidth={5}
              color={palette.forestDeep}
              trackColor={mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            >
              <Text style={[styles.levelNumber, { color: palette.forestDeep }]}>
                {level.current.level}
              </Text>
            </ProgressRing>

            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.levelTitle, { color: colors.text }]}>
                  {level.current.title}
                </Text>
                <StatusBadge label="LEVEL" variant="neutral" size="sm" />
              </View>
              <Text style={[styles.levelXpText, { color: colors.subText }]}>
                {xp} XP accumulated
              </Text>
              {level.next && (
                <Text style={[styles.levelNextText, { color: palette.forestDeep }]}>
                  {level.next.xpThreshold - xp} XP to unlock Level {level.next.level} ({level.next.title})
                </Text>
              )}
            </View>

            <Zap size={22} color={palette.saffron} fill={palette.saffron} strokeWidth={2} />
          </View>
        </SurfaceCard>

        {/* ── 4 Primary Impact Metrics ── */}
        <View style={styles.metricsGrid}>
          {/* CO2e Saved */}
          <PressableScale
            onPress={() => {
              hapticSelection();
              setActiveMetricInfo(activeMetricInfo === 'co2e' ? null : 'co2e');
            }}
            style={styles.metricGridItem}
          >
            <MetricCard
              label="CO₂e Avoided"
              value={`${Math.abs(summary.totalCo2eAvoided).toFixed(1)} kg`}
              unit="prevented"
              change={`${comparison.pctBetter}% vs avg`}
              isPositive={comparison.pctBetter >= 0}
              icon={<Leaf size={16} color={palette.forestDeep} strokeWidth={2.5} />}
            />
          </PressableScale>

          {/* Money Saved */}
          <PressableScale
            onPress={() => {
              hapticSelection();
              setActiveMetricInfo(activeMetricInfo === 'money' ? null : 'money');
            }}
            style={styles.metricGridItem}
          >
            <MetricCard
              label="Money Saved"
              value={`₹${moneySaved.toLocaleString('en-IN')}`}
              unit="saved"
              change="Est. pantry value"
              isPositive={true}
              icon={<TrendingUp size={16} color={palette.forestDeep} strokeWidth={2.5} />}
            />
          </PressableScale>

          {/* Food Waste Avoided */}
          <PressableScale
            onPress={() => {
              hapticSelection();
              setActiveMetricInfo(activeMetricInfo === 'waste' ? null : 'waste');
            }}
            style={styles.metricGridItem}
          >
            <MetricCard
              label="Waste Avoided"
              value={`${wasteWeightSaved} kg`}
              unit="diverted"
              change={`${summary.itemsConsumed} consumed`}
              isPositive={true}
              icon={<Sprout size={16} color={palette.forestDeep} strokeWidth={2.5} />}
            />
          </PressableScale>

          {/* Meals Rescued */}
          <PressableScale
            onPress={() => {
              hapticSelection();
              setActiveMetricInfo(activeMetricInfo === 'rescued' ? null : 'rescued');
            }}
            style={styles.metricGridItem}
          >
            <MetricCard
              label="Meals Rescued"
              value={summary.mealsRescued}
              unit="cooked"
              change={`${summary.itemsDiscarded} discarded`}
              isPositive={summary.mealsRescued >= summary.itemsDiscarded}
              icon={<Award size={16} color={palette.forestDeep} strokeWidth={2.5} />}
            />
          </PressableScale>
        </View>

        {/* Metric Definition Banner */}
        {activeMetricInfo && METRIC_DEFINITIONS[activeMetricInfo] && (
          <SurfaceCard style={styles.metricInfoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Info size={16} color={palette.forestDeep} strokeWidth={2.5} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  {METRIC_DEFINITIONS[activeMetricInfo].title}
                </Text>
                <Text style={[styles.infoDesc, { color: colors.subText }]}>
                  {METRIC_DEFINITIONS[activeMetricInfo].desc}
                </Text>
              </View>
              <IconButton
                icon={<X size={15} color={colors.subText} strokeWidth={2.5} />}
                onPress={() => setActiveMetricInfo(null)}
                accessibilityLabel="Close description"
                size={28}
              />
            </View>
          </SurfaceCard>
        )}

        {/* ── 7-Day Avoidance Trend Chart ── */}
        <View style={{ marginVertical: spacing[3] }}>
          <TrendChart
            title="Weekly CO₂e Diverted"
            subtitle="Daily carbon footprint savings from kitchen rescue cooking"
            data={chartData.points}
            labels={chartData.labels}
            unit="kg"
            strokeColor={palette.forestDeep}
            fillColor={mode === 'dark' ? 'rgba(2, 51, 45, 0.25)' : 'rgba(2, 51, 45, 0.12)'}
            chartType="line"
            height={150}
          />
        </View>

        {/* ── Weekly Goal Progress ── */}
        <SurfaceCard style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Target size={16} color={palette.forestDeep} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Objective</Text>
            </View>
            <PressableScale
              onPress={() => {
                hapticSelection();
                setGoalModal(true);
              }}
              hitSlop={8}
            >
              <Text style={[styles.editLink, { color: palette.forestDeep }]}>EDIT TARGETS</Text>
            </PressableScale>
          </View>

          {/* Goal 1: Meals */}
          <View style={{ marginTop: spacing[3] }}>
            <View style={styles.goalTextRow}>
              <Text style={[styles.goalLabel, { color: colors.subText }]}>Rescue Meals</Text>
              <Text style={[styles.goalScore, { color: colors.text }]}>
                {weeklyGoal.mealsThisWeek} / {weeklyGoal.targetMeals} meals
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round(weeklyGoal.progress * 100))}%`,
                    backgroundColor: palette.forestDeep,
                  },
                ]}
              />
            </View>
          </View>

          {/* Goal 2: CO2e */}
          <View style={{ marginTop: spacing[3] }}>
            <View style={styles.goalTextRow}>
              <Text style={[styles.goalLabel, { color: colors.subText }]}>Carbon Avoidance</Text>
              <Text style={[styles.goalScore, { color: colors.text }]}>
                {weeklyGoal.co2eThisWeek} / {weeklyGoal.targetCo2e} kg
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.round(weeklyGoal.co2eProgress * 100))}%`,
                    backgroundColor: palette.saffron,
                  },
                ]}
              />
            </View>
          </View>
        </SurfaceCard>

        {/* ── Household Benchmark ── */}
        <SurfaceCard style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Users size={16} color={palette.forestDeep} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Household Benchmark
              </Text>
            </View>
            {comparison.pctBetter > 0 && (
              <StatusBadge
                label={`${comparison.pctBetter}% more sustainable`}
                variant="success"
                size="sm"
              />
            )}
          </View>

          <View style={styles.compareColumns}>
            <View style={styles.compareCol}>
              <Text style={[styles.compareColLabel, { color: colors.subText }]}>YOUR FOOTPRINT</Text>
              <Text style={[styles.compareColNumber, { color: palette.forestDeep }]}>
                {comparison.userRate}
              </Text>
              <Text style={[styles.compareColSub, { color: colors.subText }]}>kg waste/meal</Text>
            </View>

            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />

            <View style={styles.compareCol}>
              <Text style={[styles.compareColLabel, { color: colors.subText }]}>AVERAGE HOUSEHOLD</Text>
              <Text style={[styles.compareColNumber, { color: colors.text }]}>
                {comparison.avgRate}
              </Text>
              <Text style={[styles.compareColSub, { color: colors.subText }]}>kg waste/meal</Text>
            </View>
          </View>
        </SurfaceCard>

        {/* ── Milestones & Badges Carousel ── */}
        <View style={{ marginTop: spacing[2], marginBottom: spacing[4] }}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Award size={16} color={palette.forestDeep} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones & Badges</Text>
            </View>
            <Text style={[type.monoBold, { color: colors.subText, fontSize: 12 }]}>
              {earned.length} of {BADGES.length} UNLOCKED
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesStrip}
          >
            {BADGES.map((b) => {
              const isUnlocked = earned.some((e) => e.id === b.id);
              const Icon =
                b.icon === 'leaf'
                  ? Leaf
                  : b.icon === 'sprout'
                  ? Sprout
                  : b.icon === 'shield'
                  ? Shield
                  : b.icon === 'globe'
                  ? Globe
                  : b.icon === 'flame'
                  ? Flame
                  : Award;

              return (
                <SurfaceCard
                  key={b.id}
                  style={[
                    styles.badgeCard,
                    !isUnlocked && { opacity: 0.45, backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIconCircle,
                      {
                        backgroundColor: isUnlocked
                          ? 'rgba(2, 51, 45, 0.12)'
                          : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                  >
                    <Icon
                      size={20}
                      color={isUnlocked ? palette.forestDeep : colors.subText}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text
                    style={[styles.badgeTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {b.label}
                  </Text>
                  <Text style={[styles.badgeStatus, { color: isUnlocked ? palette.forestDeep : colors.subText }]}>
                    {isUnlocked ? 'EARNED' : 'LOCKED'}
                  </Text>
                </SurfaceCard>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 28-Day Disposal Heatmap ── */}
        <SurfaceCard style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color={palette.forestDeep} strokeWidth={2.5} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Waste Consistency</Text>
            </View>
            <Text style={[type.monoBold, { color: colors.subText, fontSize: 11 }]}>LAST 28 DAYS</Text>
          </View>
          <Text style={[styles.heatmapSub, { color: colors.subText }]}>
            Green = zero waste. Amber = food discarded.
          </Text>

          <View style={styles.heatmapGrid}>
            {heatmap.map((d, i) => {
              const bg =
                d.count === 0
                  ? mode === 'dark'
                    ? 'rgba(2, 51, 45, 0.3)'
                    : 'rgba(2, 51, 45, 0.15)'
                  : d.count === 1
                  ? palette.saffron
                  : palette.burgundy;

              return (
                <View
                  key={i}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: bg,
                      borderColor: d.isToday ? palette.forestDeep : 'transparent',
                      borderWidth: d.isToday ? 2 : 0,
                    },
                  ]}
                />
              );
            })}
          </View>
        </SurfaceCard>

        {/* ── Waste Prevention Forecast ── */}
        {forecast.length > 0 && (
          <SurfaceCard style={[styles.cardSection, { marginTop: spacing[3] }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: spacing[2] }]}>
              At-Risk Grocery Categories
            </Text>
            <Text style={[styles.heatmapSub, { color: colors.subText, marginBottom: spacing[3] }]}>
              Items most frequently discarded. Consider buying smaller portions or freezing earlier.
            </Text>

            <View style={{ gap: spacing[2] }}>
              {forecast.map((f) => {
                const Icon = f.trend === 'up' ? TrendingUp : f.trend === 'down' ? TrendingDown : Minus;
                const trendColor =
                  f.trend === 'up'
                    ? palette.burgundy
                    : f.trend === 'down'
                    ? palette.forestDeep
                    : colors.subText;

                return (
                  <View
                    key={f.category}
                    style={[
                      styles.forecastItemRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.forecastCategory, { color: colors.text }]}>
                      {f.category.replace('_', ' ')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[type.monoBold, { color: trendColor, fontSize: 13 }]}>
                        {f.weeklyRate}/wk
                      </Text>
                      <Icon size={15} color={trendColor} strokeWidth={2.5} />
                    </View>
                  </View>
                );
              })}
            </View>
          </SurfaceCard>
        )}
      </ScrollView>

      {/* ── Goal Setting Bottom Sheet ── */}
      <GoalModal
        visible={goalModal}
        onClose={() => setGoalModal(false)}
        goals={goals}
        onSave={update}
      />
    </View>
  );
}

// ─── Goal Setting Modal ──────────────────────────────────────────
interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  goals: { target_meals: number; target_co2e: number };
  onSave: (meals: number, co2e: number) => Promise<void>;
}

function GoalModal({ visible, onClose, goals, onSave }: GoalModalProps) {
  const { colors } = useTheme();
  const [meals, setMeals] = useState(String(goals.target_meals));
  const [co2e, setCo2e] = useState(String(goals.target_co2e));

  const handleSave = async () => {
    hapticSuccess();
    await onSave(Number(meals) || 5, Number(co2e) || 10);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeaderRow}>
          <Text style={[styles.modalHeading, { color: colors.text }]}>Set Weekly Impact Goals</Text>
          <IconButton
            icon={<X size={18} color={colors.text} strokeWidth={2.5} />}
            onPress={onClose}
            accessibilityLabel="Close goal settings"
            size={36}
          />
        </View>

        <Text style={[styles.inputLabel, { color: colors.subText }]}>
          TARGET RESCUE MEALS PER WEEK
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
          ]}
          value={meals}
          onChangeText={setMeals}
          keyboardType="numeric"
          accessibilityLabel="Target meals per week"
        />

        <Text style={[styles.inputLabel, { color: colors.subText, marginTop: spacing[4] }]}>
          TARGET KG CO₂e SAVINGS PER WEEK
        </Text>
        <TextInput
          style={[
            styles.textInput,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
          ]}
          value={co2e}
          onChangeText={setCo2e}
          keyboardType="numeric"
          accessibilityLabel="Target kg carbon avoidance per week"
        />

        <PrimaryAction
          label="Save Weekly Targets"
          onPress={handleSave}
          icon={<CheckCircle2 size={18} color={palette.chalk} strokeWidth={2.5} />}
          style={{ marginTop: spacing[5] }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 12,
    fontFamily: font.monoBold,
  },
  levelCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 20,
    fontFamily: font.monoBold,
  },
  levelTitle: {
    fontSize: 17,
    fontFamily: font.sansBold,
  },
  levelXpText: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 2,
  },
  levelNextText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing[3],
  },
  metricGridItem: {
    flex: 1,
    minWidth: '47%',
  },
  metricInfoCard: {
    padding: spacing[3],
    marginBottom: spacing[3],
    backgroundColor: 'rgba(2, 51, 45, 0.08)',
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  infoDesc: {
    fontSize: 12,
    fontFamily: font.sans,
    lineHeight: 17,
    marginTop: 2,
  },
  cardSection: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: font.sansBold,
  },
  editLink: {
    fontSize: 11,
    fontFamily: font.monoBold,
    letterSpacing: 0.8,
  },
  goalTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 13,
    fontFamily: font.sans,
  },
  goalScore: {
    fontSize: 13,
    fontFamily: font.monoBold,
  },
  progressTrack: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  compareColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[2],
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  compareColLabel: {
    fontSize: 9,
    fontFamily: font.monoBold,
    letterSpacing: 0.8,
  },
  compareColNumber: {
    fontSize: 28,
    fontFamily: font.sansBold,
    marginVertical: 2,
  },
  compareColSub: {
    fontSize: 11,
    fontFamily: font.sans,
  },
  compareDivider: {
    width: 1,
    height: 48,
  },
  badgesStrip: {
    gap: 10,
    paddingTop: spacing[3],
  },
  badgeCard: {
    width: 110,
    alignItems: 'center',
    padding: spacing[3],
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  badgeTitle: {
    fontSize: 12,
    fontFamily: font.sansBold,
    textAlign: 'center',
  },
  badgeStatus: {
    fontSize: 9,
    fontFamily: font.monoBold,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  heatmapSub: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 4,
    marginBottom: spacing[3],
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatCell: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  forecastItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  forecastCategory: {
    fontSize: 14,
    fontFamily: font.sansBold,
    textTransform: 'capitalize',
  },
  modalContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalHeading: {
    fontSize: 18,
    fontFamily: font.sansBold,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: font.monoBold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: font.sans,
  },
});
