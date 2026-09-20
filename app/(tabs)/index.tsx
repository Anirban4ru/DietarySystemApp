import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Zap, Target, Leaf, Flame, ScanLine, Crown,
  ChefHat, ShoppingCart, Calendar, Droplet, Plus,
  AlertCircle, ChevronRight, CheckCircle2, Sparkles, Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, GlassPanel, BrutalButton, PressScale, useToast, Bar } from '@/components/ui';
import { usePro, useInventory, useImpact, useXp, useProfile, useMealPlan } from '@/lib/hooks';
import { PaywallModal } from '@/components/PaywallModal';
import { computeRDA, computeTDEE } from '@/lib/rda';

const { width: SCREEN_W } = Dimensions.get('window');

function daysLeft(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function Dashboard() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { isPro } = usePro();
  const { items } = useInventory();
  const { xp, addXp } = useXp();
  const { log } = useImpact();
  const { profile } = useProfile();
  const { plan } = useMealPlan();

  const [showPaywall, setShowPaywall] = useState(false);
  const [waterMl, setWaterMl] = useState(1250);

  // RDA & Calorie targets
  const userTdee = useMemo(() => {
    return computeTDEE(profile ?? {
      id: '', age: 30, sex: 'female', weight_kg: 70, height_cm: 170,
      activity_level: 'moderate', conditions: [], updated_at: '',
    });
  }, [profile]);

  const rda = useMemo(() => {
    return computeRDA(profile ?? {
      id: '', age: 30, sex: 'female', weight_kg: 70, height_cm: 170,
      activity_level: 'moderate', conditions: [], updated_at: '',
    });
  }, [profile]);

  // Derived inventory stats
  const expiringItems = useMemo(() => {
    return items
      .filter((i) => {
        const d = daysLeft(i.expires_at);
        return d >= 0 && d <= 3;
      })
      .sort((a, b) => daysLeft(a.expires_at) - daysLeft(b.expires_at));
  }, [items]);

  const totalCo2Saved = useMemo(() => {
    return log
      .filter((l) => l.event_type === 'rescue_meal')
      .reduce((sum, l) => sum + (l.co2e_kg || 0), 0);
  }, [log]);

  const mealsRescuedCount = useMemo(() => {
    return log.filter((l) => l.event_type === 'rescue_meal').length;
  }, [log]);

  // Time & Greeting
  const hour = new Date().getHours();
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  let greeting = 'Good morning';
  let mealContext = 'Breakfast Fuel';
  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    mealContext = 'Lunch Energy';
  } else if (hour >= 17) {
    greeting = 'Good evening';
    mealContext = 'Dinner Rescue';
  }

  const userName = profile?.name ? profile.name.split(' ')[0] : 'Chef';

  const addWater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterMl((w) => {
      const next = Math.min(3000, w + 250);
      if (next === 2500) {
        addXp(15);
        toast.show('Hydration target reached! +15 XP', 'success');
      } else {
        toast.show('+250ml logged!', 'info');
      }
      return next;
    });
  };

  const handleScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scan');
  };

  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Top Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateText, { color: colors.subText }]}>{dateFormatted.toUpperCase()}</Text>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              {greeting}, <Text style={{ color: palette.sageDeep }}>{userName}</Text>
            </Text>
          </View>
          
          <PressScale
            onPress={() => setShowPaywall(true)}
            style={[
              styles.proPill,
              {
                backgroundColor: isPro ? 'rgba(245, 158, 11, 0.15)' : 'rgba(46, 117, 89, 0.15)',
                borderColor: isPro ? palette.amber : palette.sageDeep,
              }
            ]}
          >
            <Crown size={15} color={isPro ? palette.amberDeep : palette.sageDeep} strokeWidth={2.5} />
            <Text
              style={[
                styles.proPillText,
                { color: isPro ? palette.amberDeep : palette.sageDeep }
              ]}
            >
              {isPro ? 'PRO VIP' : 'GO PRO'}
            </Text>
          </PressScale>
        </View>

        {/* ── 2. Primary Hero: Daily Nutrition & Macro Budget ── */}
        <GlassPanel style={styles.macroHeroCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>DAILY NUTRITION TARGETS</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Macro & Calorie Balance</Text>
            </View>
            <View style={styles.calorieBadge}>
              <Flame size={14} color={palette.amberDeep} />
              <Text style={[styles.calorieBadgeText, { color: palette.amberDeep }]}>
                {Math.round(userTdee * 0.65)} / {userTdee} kcal
              </Text>
            </View>
          </View>

          {/* Calorie Progress */}
          <View style={{ marginVertical: 14 }}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.macroLabel, { color: colors.text }]}>Calories Consumed (65%)</Text>
              <Text style={[styles.macroVal, { color: colors.subText }]}>{Math.round(userTdee * 0.35)} kcal remaining</Text>
            </View>
            <Bar value={0.65} color={palette.sageDeep} track={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} />
          </View>

          {/* 3 Macro Pillars */}
          <View style={styles.macroPillarsRow}>
            <View style={[styles.macroCol, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.macroColLabel, { color: palette.sageDeep }]}>PROTEIN</Text>
              <Text style={[styles.macroColVal, { color: colors.text }]}>{Math.round(rda.proteinG * 0.7)}g</Text>
              <Text style={[styles.macroColTarget, { color: colors.subText }]}>of {rda.proteinG}g</Text>
              <View style={{ marginTop: 6 }}>
                <Bar value={0.7} color={palette.sageDeep} track={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
              </View>
            </View>

            <View style={[styles.macroCol, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.macroColLabel, { color: palette.clayDeep }]}>CARBS</Text>
              <Text style={[styles.macroColVal, { color: colors.text }]}>{Math.round(rda.carbG * 0.6)}g</Text>
              <Text style={[styles.macroColTarget, { color: colors.subText }]}>of {rda.carbG}g</Text>
              <View style={{ marginTop: 6 }}>
                <Bar value={0.6} color={palette.clayDeep} track={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
              </View>
            </View>

            <View style={[styles.macroCol, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.macroColLabel, { color: palette.amberDeep }]}>FATS</Text>
              <Text style={[styles.macroColVal, { color: colors.text }]}>{Math.round(rda.fatG * 0.55)}g</Text>
              <Text style={[styles.macroColTarget, { color: colors.subText }]}>of {rda.fatG}g</Text>
              <View style={{ marginTop: 6 }}>
                <Bar value={0.55} color={palette.amberDeep} track={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
              </View>
            </View>
          </View>

          {/* Hydration Tracker */}
          <View style={[styles.waterRow, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.waterIconWrap}>
                <Droplet size={18} color="#3B82F6" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={[styles.waterTitle, { color: colors.text }]}>Hydration Tracker</Text>
                <Text style={[styles.waterSub, { color: colors.subText }]}>{waterMl} ml / 2,500 ml ({Math.round((waterMl / 2500) * 100)}%)</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={addWater} style={styles.addWaterBtn}>
              <Plus size={14} color="#3B82F6" strokeWidth={3} />
              <Text style={styles.addWaterBtnText}>+250ml</Text>
            </TouchableOpacity>
          </View>
        </GlassPanel>

        {/* ── 3. Expiring Food Urgent Ticker ── */}
        {expiringItems.length > 0 && (
          <GlassPanel style={[styles.urgentBanner, { borderColor: palette.crimson + '40', backgroundColor: isDark ? '#261214' : '#FFF5F5' }]}>
            <View style={styles.urgentHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color={palette.crimson} strokeWidth={2.5} />
                <Text style={[styles.urgentTitle, { color: palette.crimson }]}>
                  {expiringItems.length} {expiringItems.length === 1 ? 'Item' : 'Items'} Expiring Soon!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/recipes')}
                style={styles.rescueBtn}
              >
                <Text style={styles.rescueBtnText}>Rescue Meal →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {expiringItems.map((item) => {
                const days = daysLeft(item.expires_at);
                return (
                  <View key={item.id} style={[styles.expiringChip, { borderColor: palette.crimson + '30' }]}>
                    <Text style={[styles.expiringName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.expiringDays, { color: palette.crimson }]}>
                      {days <= 0 ? 'Expires today' : days === 1 ? 'Tomorrow' : `${days} days`}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </GlassPanel>
        )}

        {/* ── 4. Floating Quick Actions Grid ── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing[5] }]}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {/* Action 1: AI Scanner */}
          <PressScale scale={0.96} onPress={handleScanPress} style={styles.actionCardWrap}>
            <View style={[styles.actionCard, { backgroundColor: palette.sageDeep }]}>
              <View style={styles.actionCardIconBg}>
                <ScanLine size={22} color={palette.chalk} strokeWidth={2.4} />
              </View>
              <Text style={styles.actionCardTitle}>AI Scanner</Text>
              <Text style={styles.actionCardSub}>Multi-Item & Freshness</Text>
              <View style={styles.actionCardBadge}>
                <Sparkles size={11} color={palette.amber} />
                <Text style={styles.actionCardBadgeText}>Vision AI</Text>
              </View>
            </View>
          </PressScale>

          {/* Action 2: Rescue Recipes */}
          <PressScale scale={0.96} onPress={() => router.push('/recipes')} style={styles.actionCardWrap}>
            <View style={[styles.actionCard, { backgroundColor: isDark ? '#1C2820' : '#EAF2EC', borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.actionCardIconBg, { backgroundColor: palette.sageDeep + '20' }]}>
                <ChefHat size={22} color={palette.sageDeep} strokeWidth={2.4} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>Rescue Chef</Text>
              <Text style={[styles.actionCardSub, { color: colors.subText }]}>Smart Pareto Meals</Text>
              <View style={[styles.actionCardBadge, { backgroundColor: 'rgba(46,117,89,0.15)' }]}>
                <Zap size={11} color={palette.sageDeep} />
                <Text style={[styles.actionCardBadgeText, { color: palette.sageDeep }]}>NSGA-II</Text>
              </View>
            </View>
          </PressScale>

          {/* Action 3: Smart Grocery */}
          <PressScale scale={0.96} onPress={() => router.push('/shopping')} style={styles.actionCardWrap}>
            <View style={[styles.actionCard, { backgroundColor: isDark ? '#1F2420' : '#F2F6F3', borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.actionCardIconBg, { backgroundColor: 'rgba(217, 119, 6, 0.15)' }]}>
                <ShoppingCart size={22} color={palette.amberDeep} strokeWidth={2.4} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>Smart Shop</Text>
              <Text style={[styles.actionCardSub, { color: colors.subText }]}>Auto Restock List</Text>
            </View>
          </PressScale>

          {/* Action 4: Weekly Meal Plan */}
          <PressScale scale={0.96} onPress={() => router.push('/plan')} style={styles.actionCardWrap}>
            <View style={[styles.actionCard, { backgroundColor: isDark ? '#1F2420' : '#F2F6F3', borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.actionCardIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Calendar size={22} color="#3B82F6" strokeWidth={2.4} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>Meal Plan</Text>
              <Text style={[styles.actionCardSub, { color: colors.subText }]}>7-Day Schedule</Text>
            </View>
          </PressScale>
        </View>

        {/* ── 5. Today's Meal Timeline ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s Meal Log</Text>
          <TouchableOpacity onPress={() => router.push('/plan')}>
            <Text style={[styles.seeAllText, { color: palette.sageDeep }]}>Plan Week →</Text>
          </TouchableOpacity>
        </View>

        <GlassPanel style={styles.timelineCard}>
          {/* Breakfast */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineTimeCol}>
              <Text style={[styles.timelineTimeText, { color: colors.subText }]}>08:30 AM</Text>
              <CheckCircle2 size={16} color={palette.sageDeep} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineMealType, { color: palette.sageDeep }]}>BREAKFAST</Text>
              <Text style={[styles.timelineMealName, { color: colors.text }]}>Avocado Sourdough & Poached Eggs</Text>
              <Text style={[styles.timelineCal, { color: colors.subText }]}>380 kcal • 18g Protein</Text>
            </View>
          </View>

          <View style={[styles.timelineDivider, { backgroundColor: colors.border }]} />

          {/* Lunch */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineTimeCol}>
              <Text style={[styles.timelineTimeText, { color: colors.subText }]}>01:15 PM</Text>
              <CheckCircle2 size={16} color={palette.sageDeep} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineMealType, { color: palette.sageDeep }]}>LUNCH</Text>
              <Text style={[styles.timelineMealName, { color: colors.text }]}>Rescue Veggie Stir-Fry & Brown Rice</Text>
              <Text style={[styles.timelineCal, { color: colors.subText }]}>540 kcal • 24g Protein • Rescued 2 items</Text>
            </View>
          </View>

          <View style={[styles.timelineDivider, { backgroundColor: colors.border }]} />

          {/* Dinner */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineTimeCol}>
              <Text style={[styles.timelineTimeText, { color: colors.subText }]}>07:30 PM</Text>
              <Clock size={16} color={palette.amberDeep} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineMealType, { color: palette.amberDeep }]}>DINNER (UP NEXT)</Text>
              <Text style={[styles.timelineMealName, { color: colors.text }]}>Hearty Mediterranean Lentil Stew</Text>
              <Text style={[styles.timelineCal, { color: colors.subText }]}>520 kcal • 28g Protein</Text>
            </View>
          </View>
        </GlassPanel>

        {/* ── 6. Gamification & Sustainability Stats ── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing[5] }]}>Eco & Health Progress</Text>
        <View style={styles.statsRow}>
          <GlassPanel style={[styles.statBox, { flex: 1 }]}>
            <View style={styles.statIconHeader}>
              <Flame size={20} color={palette.crimson} />
              <Text style={[styles.statBadge, { color: palette.crimson, backgroundColor: palette.crimson + '15' }]}>
                STREAK
              </Text>
            </View>
            <Text style={[styles.statBigNumber, { color: colors.text }]}>5 Days</Text>
            <Text style={[styles.statSubText, { color: colors.subText }]}>Top 10% eco-chefs</Text>
          </GlassPanel>

          <GlassPanel style={[styles.statBox, { flex: 1 }]}>
            <View style={styles.statIconHeader}>
              <Zap size={20} color={palette.amberDeep} />
              <Text style={[styles.statBadge, { color: palette.amberDeep, backgroundColor: palette.amberDeep + '15' }]}>
                LEVEL 4
              </Text>
            </View>
            <Text style={[styles.statBigNumber, { color: colors.text }]}>{xp} XP</Text>
            <Text style={[styles.statSubText, { color: colors.subText }]}>Next level: 500 XP</Text>
          </GlassPanel>

          <GlassPanel style={[styles.statBox, { flex: 1 }]}>
            <View style={styles.statIconHeader}>
              <Leaf size={20} color={palette.sageDeep} />
              <Text style={[styles.statBadge, { color: palette.sageDeep, backgroundColor: palette.sageDeep + '15' }]}>
                IMPACT
              </Text>
            </View>
            <Text style={[styles.statBigNumber, { color: colors.text }]}>{totalCo2Saved.toFixed(1)}kg</Text>
            <Text style={[styles.statSubText, { color: colors.subText }]}>CO₂ Diverted</Text>
          </GlassPanel>
        </View>

        {/* ── 7. Nourish+ Pro Showcase Banner (If not pro) ── */}
        {!isPro && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowPaywall(true)} style={{ marginTop: spacing[5] }}>
            <View style={[styles.proBannerCard, { backgroundColor: isDark ? '#1C2518' : '#F0F8F2', borderColor: palette.amber + '40' }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Crown size={18} color={palette.amberDeep} />
                  <Text style={[styles.proBannerTag, { color: palette.amberDeep }]}>NOURISH+ PRO</Text>
                </View>
                <Text style={[styles.proBannerTitle, { color: colors.text }]}>Unlock the Clinical AI Engine</Text>
                <Text style={[styles.proBannerDesc, { color: colors.subText }]}>
                  Unlimited Multi-Item Vision AI, Clinical Condition Ingredient Swaps & Auto Grocery Restock.
                </Text>
              </View>
              <View style={styles.proBannerArrow}>
                <ChevronRight size={20} color={palette.amberDeep} />
              </View>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing[4],
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  dateText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    letterSpacing: 1.2,
  },
  greetingText: {
    fontSize: 26,
    fontFamily: font.sansBold,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
    gap: 5,
  },
  proPillText: {
    fontSize: 12,
    fontFamily: font.sansBold,
    letterSpacing: 0.8,
  },
  macroHeroCard: {
    padding: spacing[4],
    borderRadius: 22,
    marginBottom: spacing[4],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: font.sansBold,
    letterSpacing: 1.1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: font.sansBold,
    marginTop: 2,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  calorieBadgeText: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: font.sansBold,
  },
  macroVal: {
    fontSize: 11,
    fontFamily: font.sans,
  },
  macroPillarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  macroCol: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
  },
  macroColLabel: {
    fontSize: 9,
    fontFamily: font.sansBold,
    letterSpacing: 0.8,
  },
  macroColVal: {
    fontSize: 16,
    fontFamily: font.sansBold,
    marginTop: 3,
  },
  macroColTarget: {
    fontSize: 10,
    fontFamily: font.sans,
    marginTop: 1,
  },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  waterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  waterSub: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 1,
  },
  addWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addWaterBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontFamily: font.sansBold,
  },
  urgentBanner: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: spacing[4],
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentTitle: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  rescueBtn: {
    backgroundColor: palette.crimson,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rescueBtnText: {
    color: palette.chalk,
    fontSize: 11,
    fontFamily: font.sansBold,
  },
  expiringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  expiringName: {
    fontSize: 12,
    fontFamily: font.sansBold,
  },
  expiringDays: {
    fontSize: 10,
    fontFamily: font.sansBold,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: font.sansBold,
    letterSpacing: -0.3,
    marginBottom: spacing[3],
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing[4],
  },
  actionCardWrap: {
    width: (SCREEN_W - 32 - 10) / 2,
  },
  actionCard: {
    padding: 14,
    borderRadius: 18,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  actionCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 15,
    fontFamily: font.sansBold,
    color: palette.chalk,
    marginTop: 8,
  },
  actionCardSub: {
    fontSize: 11,
    fontFamily: font.sans,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  actionCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  actionCardBadgeText: {
    fontSize: 9,
    fontFamily: font.sansBold,
    color: palette.amber,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  timelineCard: {
    padding: spacing[4],
    borderRadius: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineTimeCol: {
    width: 65,
    alignItems: 'center',
  },
  timelineTimeText: {
    fontSize: 10,
    fontFamily: font.sansBold,
  },
  timelineContent: {
    flex: 1,
  },
  timelineMealType: {
    fontSize: 10,
    fontFamily: font.sansBold,
    letterSpacing: 0.8,
  },
  timelineMealName: {
    fontSize: 14,
    fontFamily: font.sansBold,
    marginTop: 2,
  },
  timelineCal: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 2,
  },
  timelineDivider: {
    height: 1,
    marginVertical: 12,
    marginLeft: 77,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  statIconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  statBadge: {
    fontSize: 8,
    fontFamily: font.sansBold,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  statBigNumber: {
    fontSize: 18,
    fontFamily: font.sansBold,
    letterSpacing: -0.5,
  },
  statSubText: {
    fontSize: 10,
    fontFamily: font.sans,
    marginTop: 2,
  },
  proBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  proBannerTag: {
    fontSize: 10,
    fontFamily: font.sansBold,
    letterSpacing: 1,
  },
  proBannerTitle: {
    fontSize: 15,
    fontFamily: font.sansBold,
    marginTop: 2,
  },
  proBannerDesc: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 3,
    lineHeight: 16,
  },
  proBannerArrow: {
    paddingLeft: 12,
  },
});
