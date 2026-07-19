import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Leaf, Flame, Award, TrendingUp, TrendingDown, Minus, Target, X, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { BrutalButton, GlassPanel, Label, Pill, Bar, Divider, SectionHeader, useTheme } from '@/components/ui';
import { useImpact, useDisposals, useXp, useWeeklyGoals } from '@/lib/hooks';
import { summarizeImpact, forecastDisposal, earnedBadges, BADGES } from '@/lib/impact';
import { compareHousehold, computeLevel, computeWeeklyGoal } from '@/lib/features';

export default function ImpactScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { log } = useImpact();
  const { disposals } = useDisposals();
  const { xp } = useXp();
  const { goals, update } = useWeeklyGoals();
  const [goalModal, setGoalModal] = useState(false);

  const summary = useMemo(() => summarizeImpact(log), [log]);
  const forecast = useMemo(() => forecastDisposal(disposals), [disposals]);
  const earned = useMemo(() => earnedBadges(summary), [summary]);
  const level = useMemo(() => computeLevel(xp), [xp]);
  const weeklyGoal = useMemo(() => computeWeeklyGoal(log, goals.target_meals, goals.target_co2e), [log, goals]);
  const comparison = useMemo(() => compareHousehold(summary.mealsRescued, summary.totalCo2eAvoided), [summary]);

  const maxDay = Math.max(0.1, ...summary.co2eByDay.map((d) => Math.abs(d.kg)));

  const heatmap = useMemo(() => {
    const days: { date: string; count: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const count = disposals.filter((e) => new Date(e.created_at).toISOString().slice(0, 10) === ds).length;
      days.push({ date: ds, count, isToday: i === 0 });
    }
    return days;
  }, [disposals]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={[type.display, { color: colors.text }]}>Impact</Text>
          <Text style={[type.body, { color: colors.subText }]}>Your food waste footprint</Text>
        </View>

        {/* Level + XP */}
        <GlassPanel style={[styles.levelCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.levelHead}>
            <View style={styles.levelBadge}>
              <Text style={[type.display, { fontSize: 24, color: palette.chalk }]}>{level.current.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.h2, { color: colors.text }]}>{level.current.title}</Text>
              <Text style={[type.bodySm, { color: colors.subText }]}>{xp} XP earned</Text>
            </View>
            <Zap size={24} color={palette.warning} fill={palette.warning} strokeWidth={2.5} />
          </View>
          {level.next && (
            <View style={{ marginTop: spacing[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[type.bodySm, { color: colors.subText }]}>{level.next.title}</Text>
                <Text style={[type.bodySm, { color: colors.subText }]}>{level.next.xpThreshold - xp} XP to go</Text>
              </View>
              <Bar value={level.progress} color={palette.warning} track={colors.border} />
            </View>
          )}
        </GlassPanel>

        {/* Big CO2 number */}
        <GlassPanel style={[styles.co2Card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Leaf size={28} color={palette.sageDeep} strokeWidth={2.5} />
          <View style={{ marginLeft: spacing[3] }}>
            <Text style={[type.display, { fontSize: 40, color: summary.totalCo2eAvoided >= 0 ? palette.sageDeep : palette.danger }]}>
              {Math.abs(summary.totalCo2eAvoided).toFixed(1)}
            </Text>
            <Text style={[type.body, { color: colors.subText }]}>kg CO2 saved</Text>
          </View>
        </GlassPanel>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatBox label="Rescued" value={summary.mealsRescued} color={colors.text} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
          <StatBox label="Eaten" value={summary.itemsConsumed} color={colors.text} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
          <StatBox label="Tossed" value={summary.itemsDiscarded} color={palette.danger} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
        </View>

        {/* Streak */}
        <View style={[styles.streakBox, { borderColor: palette.warning }]}>
          <Flame size={18} color={palette.warning} fill={palette.warning} strokeWidth={2.5} />
          <Text style={[type.body, { marginLeft: 8, color: palette.warning, fontFamily: font.sansBold }]}>{summary.streakDays} day streak</Text>
        </View>

        {/* Weekly goal */}
        <SectionHeader title="This Week" colors={colors} />
        <GlassPanel style={[styles.goalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.goalHead}>
            <Target size={16} color={colors.text} strokeWidth={2.5} />
            <Text style={[type.body, { marginLeft: 8, color: colors.text, fontFamily: font.sansBold, flex: 1 }]}>Weekly goal</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setGoalModal(true); }}>
              <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 10 }]}>EDIT</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: spacing[3] }}>
            <Text style={[type.bodySm, { color: colors.subText, marginBottom: 4 }]}>{weeklyGoal.mealsThisWeek} of {weeklyGoal.targetMeals} meals</Text>
            <Bar value={weeklyGoal.progress} color={palette.sageDeep} track={colors.border} />
          </View>
          <View style={{ marginTop: spacing[3] }}>
            <Text style={[type.bodySm, { color: colors.subText, marginBottom: 4 }]}>{weeklyGoal.co2eThisWeek} of {weeklyGoal.targetCo2e} kg CO2</Text>
            <Bar value={weeklyGoal.co2eProgress} color={palette.warning} track={colors.border} />
          </View>
        </GlassPanel>

        {/* CO2 chart */}
        {summary.co2eByDay.length > 0 && (
          <>
            <SectionHeader title="Last 7 Days" colors={colors} />
            <GlassPanel style={[styles.chartCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.chart}>
                {summary.co2eByDay.map((d) => {
                  const h = (Math.abs(d.kg) / maxDay) * 100;
                  return (
                    <View key={d.day} style={styles.chartCol}>
                      <View style={styles.chartBarWrap}>
                        <View style={[styles.chartBar, { height: `${Math.max(4, h)}%`, backgroundColor: d.kg >= 0 ? palette.sageDeep : palette.danger, borderRadius: 4 }]} />
                      </View>
                      <Text style={[type.mono, { fontSize: 8, color: colors.subText, marginTop: 4 }]}>{d.day.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassPanel>
          </>
        )}

        {/* Comparison */}
        <SectionHeader title="vs Average Household" colors={colors} />
        <GlassPanel style={[styles.compareCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.compareRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.bodySm, { color: colors.subText }]}>You</Text>
              <Text style={[type.h1, { color: palette.sageDeep }]}>{comparison.userRate}</Text>
              <Text style={[type.bodySm, { color: colors.subText }]}>kg/meal</Text>
            </View>
            <View style={[styles.compareVs, { borderColor: colors.border }]}>
              <Text style={[type.mono, { color: colors.subText, fontSize: 9 }]}>vs</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[type.bodySm, { color: colors.subText }]}>Average</Text>
              <Text style={[type.h1, { color: palette.danger }]}>{comparison.avgRate}</Text>
              <Text style={[type.bodySm, { color: colors.subText }]}>kg/meal</Text>
            </View>
          </View>
          {comparison.pctBetter > 0 && (
            <View style={[styles.compareBadge, { backgroundColor: palette.sageDeep }]}>
              <Text style={[type.monoBold, { color: palette.chalk, fontSize: 11 }]}>{comparison.pctBetter}% better</Text>
            </View>
          )}
        </GlassPanel>

        {/* Waste heatmap */}
        <SectionHeader title="Waste History" subtitle="Last 4 weeks. Darker = more food tossed." colors={colors} />
        <GlassPanel style={[styles.heatmapCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.heatmapGrid}>
            {heatmap.map((d, i) => {
              const bg = d.count === 0 ? colors.border : d.count === 1 ? palette.danger + '80' : palette.danger;
              return (
                <View key={i} style={[styles.heatCell, { backgroundColor: bg, borderColor: d.isToday ? colors.text : 'transparent', borderWidth: d.isToday ? 2 : 0, borderRadius: 4 }]} />
              );
            })}
          </View>
        </GlassPanel>

        {/* Badges */}
        <SectionHeader title="Badges" colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
          {BADGES.map((b) => {
            const got = earned.some((e) => e.id === b.id);
            return (
              <View key={b.id} style={[styles.badge, { borderColor: got ? palette.sageDeep : colors.border, backgroundColor: colors.surface, opacity: got ? 1 : 0.4 }]}>
                <View style={[styles.badgeIcon, { backgroundColor: got ? palette.sageDeep : colors.border, borderRadius: 20 }]}>
                  <Award size={18} color={got ? palette.chalk : colors.subText} strokeWidth={2.5} />
                </View>
                <Text style={[type.bodySm, { marginTop: 6, color: colors.text, fontFamily: font.sansBold, textAlign: 'center' }]}>{b.label}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Forecast */}
        {forecast.length > 0 && (
          <>
            <SectionHeader title="Your Habits" subtitle="What you toss most often." colors={colors} />
            <GlassPanel style={[styles.forecastCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {forecast.map((f) => {
                const Icon = f.trend === 'up' ? TrendingUp : f.trend === 'down' ? TrendingDown : Minus;
                const color = f.trend === 'up' ? palette.danger : f.trend === 'down' ? palette.sageDeep : colors.subText;
                return (
                  <View key={f.category} style={[styles.forecastRow, { borderBottomColor: colors.border }]}>
                    <Text style={[type.body, { flex: 1, color: colors.text, textTransform: 'capitalize' }]}>{f.category.replace('_', ' ')}</Text>
                    <Text style={[type.monoBold, { color, marginRight: 8 }]}>{f.weeklyRate}/wk</Text>
                    <Icon size={16} color={color} strokeWidth={2.5} />
                  </View>
                );
              })}
            </GlassPanel>
          </>
        )}

        <GoalModal visible={goalModal} onClose={() => setGoalModal(false)} goals={goals} onSave={update} />
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color, subColor, borderColor, bg }: { label: string; value: any; color: string; subColor: string; borderColor: string, bg: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor, padding: spacing[3], backgroundColor: bg, borderRadius: 12 }}>
      <Text style={[type.h1, { color }]}>{value}</Text>
      <Text style={[type.bodySm, { color: subColor, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

function GoalModal({ visible, onClose, goals, onSave }: { visible: boolean; onClose: () => void; goals: any; onSave: any }) {
  const { colors } = useTheme();
  const [meals, setMeals] = useState(String(goals.target_meals));
  const [co2e, setCo2e] = useState(String(goals.target_co2e));

  const save = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSave(Number(meals) || 5, Number(co2e) || 10);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GlassPanel style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Set your goals</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <X size={24} color={colors.subText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Label>MEALS PER WEEK</Label>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} value={meals} onChangeText={setMeals} keyboardType="numeric" />
          <Label style={{ marginTop: spacing[4] }}>KG CO2 TO SAVE</Label>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} value={co2e} onChangeText={setCo2e} keyboardType="numeric" />
          <BrutalButton variant="sage" onPress={save} style={{ marginTop: spacing[5] }}>SAVE GOALS</BrutalButton>
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing[4] },
  header: { marginBottom: spacing[4], marginTop: spacing[3] },
  levelCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  levelHead: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: palette.sageDeep, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  co2Card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing[3] },
  streakBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.warning + '20', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderRadius: 12, alignSelf: 'flex-start', marginBottom: spacing[4] },
  goalCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  goalHead: { flexDirection: 'row', alignItems: 'center' },
  chartCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  chart: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 8 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarWrap: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '80%' },
  compareCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  compareRow: { flexDirection: 'row', alignItems: 'center' },
  compareVs: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing[2] },
  compareBadge: { marginTop: spacing[3], paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
  heatmapCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatCell: { width: 34, height: 34 },
  badgeScroll: { flexDirection: 'row', marginBottom: spacing[4] },
  badge: { width: 100, marginRight: spacing[3], padding: spacing[3], borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  badgeIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  forecastCard: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  forecastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: font.sans, fontSize: 15, marginTop: 8 },
});
