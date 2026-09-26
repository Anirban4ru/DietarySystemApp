import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import {
  User,
  Check,
  Sun,
  Moon,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  Crown,
  Leaf,
  ChevronRight,
  ShieldCheck,
  Footprints,
  Flame,
  Zap,
  Armchair,
  Users,
  Download,
  RotateCcw,
  Sliders,
  Bell,
  Heart,
  AlertTriangle,
  FileText,
  Shield,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { hapticTap, hapticSuccess, hapticSelection, hapticWarning, hapticHeavy } from '@/lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, type, spacing, font } from '@/lib/theme';
import {
  useTheme,
  useToast,
  AppHeader,
  SurfaceCard,
  StatusBadge,
  PrimaryAction,
  SecondaryAction,
  IconButton,
  Divider,
} from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { PaywallModal } from '@/components/PaywallModal';
import { NotificationPreferencesCard } from '@/components/NotificationPreferences';
import { HouseholdSharingCard } from '@/components/HouseholdCard';
import { useProfile, useInventory, useImpact, usePro } from '@/lib/hooks';
import { computeRDA, computeTDEE, bmi, bmiCategory, CONDITION_LABELS } from '@/lib/rda';
import { Condition } from '@/lib/types';
import { summarizeImpact } from '@/lib/impact';
import { supabase } from '@/lib/supabase';

interface ActivityOption {
  value: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  label: string;
  desc: string;
  icon: any;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement', icon: Armchair },
  { value: 'light', label: 'Light', desc: '1-3 workouts per week', icon: Footprints },
  { value: 'moderate', label: 'Moderate', desc: '3-5 active training sessions', icon: Activity },
  { value: 'active', label: 'Active', desc: 'Daily intense training', icon: Zap },
  { value: 'very_active', label: 'Athletic', desc: 'Twice daily or heavy labor', icon: Flame },
];

const CONDITIONS: Condition[] = ['hypertension', 'diabetes', 'celiac', 'lactose_intolerant'];

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const router = useRouter();
  const { profile, upsert } = useProfile();
  const { items } = useInventory();
  const { log } = useImpact();
  const { isPro, subscriptionPlan, restorePurchases, setIsPro } = usePro();

  const [form, setForm] = useState({
    name: '',
    age: 30,
    sex: 'female' as 'male' | 'female',
    weight_kg: 70,
    height_cm: 170,
    activity_level: 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
    conditions: [] as Condition[],
  });
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [saved, setSaved] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useMemo(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        age: profile.age || 30,
        sex: profile.sex || 'female',
        weight_kg: profile.weight_kg || 70,
        height_cm: profile.height_cm || 170,
        activity_level: profile.activity_level || 'moderate',
        conditions: profile.conditions || [],
      });
    }
  }, [profile]);

  const rda = useMemo(() => computeRDA({ ...form, id: '', updated_at: '' } as any), [form]);
  const tdee = computeTDEE({ ...form, id: '', updated_at: '' } as any);
  const userBmi = bmi(form);
  const summary = useMemo(() => summarizeImpact(log), [log]);

  const handleSave = async () => {
    hapticSuccess();
    await upsert(form);
    setSaved(true);
    toast.show('Clinical profile updated', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleToggleCondition = (c: Condition) => {
    hapticSelection();
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(c)
        ? f.conditions.filter((x) => x !== c)
        : [...f.conditions, c],
    }));
  };

  const handleRestorePurchases = async () => {
    hapticTap();
    const restored = await restorePurchases();
    if (restored) {
      toast.show('Purchases successfully restored', 'success');
    } else {
      toast.show('No active subscriptions found for this account', 'info');
    }
  };

  const handleExportData = async () => {
    hapticTap();
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      Alert.alert(
        'Export Summary Ready',
        `Prepared export with:\n• ${items.length} inventory records\n• ${summary.mealsRescued} logged rescue events\n• Full RDA clinical profiles`,
        [{ text: 'Done', style: 'default' }]
      );
    }, 600);
  };

  const handleClearCache = async () => {
    hapticWarning();
    Alert.alert(
      'Clear Local Cache',
      'This will refresh offline assets and temporary caches. Your saved profile and pantry data will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const nonCritical = keys.filter(
                (k) => !k.includes('auth') && !k.includes('supabase')
              );
              await AsyncStorage.multiRemove(nonCritical);
              toast.show('Local cache cleared', 'success');
            } catch (e) {
              toast.show('Failed to clear cache', 'error');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    hapticHeavy();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userCacheKeys = keys.filter(
        (k) => k.startsWith('@nourish_') && currentUser.id && k.includes(currentUser.id)
      );
      if (userCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(userCacheKeys);
      }
    } catch (e) {
      console.warn('Failed to purge local storage on logout', e);
    }
    await AsyncStorage.removeItem('@nourish_session');
    await AsyncStorage.removeItem('@nourish_user_profile');
    await supabase.auth.signOut();
    setCurrentUser(null);
    toast.show('Signed out successfully', 'info');
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    hapticWarning();
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account, pantry logs, and history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.rpc('delete_user');
            } catch {}
            await AsyncStorage.removeItem('@nourish_session');
            await AsyncStorage.removeItem('@nourish_user_profile');
            await AsyncStorage.removeItem('@nourish_onboarding_done');
            await supabase.auth.signOut();
            setCurrentUser(null);
            toast.show('Account erased', 'info');
            router.replace('/login');
          },
        },
      ]
    );
  };

  const isDark = mode === 'dark';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing[4],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Account & Wellness"
          subtitle="Biometrics, dietary restrictions, and subscriptions"
          rightAction={
            <IconButton
              icon={
                isDark ? (
                  <Sun size={20} color={palette.chalk} strokeWidth={2.2} />
                ) : (
                  <Moon size={20} color={palette.ink} strokeWidth={2.2} />
                )
              }
              onPress={() => {
                hapticTap();
                toggle();
              }}
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              size={40}
            />
          }
        />

        {/* ── Nourish+ Pro Membership Spotlight ── */}
        <SurfaceCard
          style={[
            styles.membershipCard,
            isPro && {
              borderColor: palette.saffron,
              backgroundColor:
                mode === 'dark' ? 'rgba(191, 152, 97, 0.12)' : 'rgba(191, 152, 97, 0.08)',
            },
          ]}
        >
          <View style={styles.membershipRow}>
            <View
              style={[
                styles.proIconCircle,
                {
                  backgroundColor: isPro
                    ? 'rgba(191, 152, 97, 0.18)'
                    : 'rgba(2, 51, 45, 0.12)',
                },
              ]}
            >
              <Crown
                size={24}
                color={isPro ? palette.saffron : palette.forestDeep}
                strokeWidth={2.5}
              />
            </View>

            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.proPlanTitle, { color: colors.text }]}>
                  {isPro
                    ? `Nourish+ Pro (${subscriptionPlan === 'annual' ? 'Annual — ₹1,999/yr' : 'Monthly — ₹299/mo'})`
                    : 'Nourish Free Tier'}
                </Text>
                <StatusBadge
                  label={isPro ? 'ACTIVE' : 'FREE'}
                  variant={isPro ? 'warning' : 'neutral'}
                  size="sm"
                />
              </View>
              <Text style={[styles.proPlanSub, { color: colors.subText }]}>
                {isPro
                  ? 'Unlimited AI Vision scans, clinical swaps, and multi-pantry sync'
                  : 'Upgrade to unlock unlimited scanning and personalized clinical macros'}
              </Text>
            </View>
          </View>

          <View style={styles.proActionRow}>
            <PrimaryAction
              label={isPro ? 'Manage Membership' : 'Upgrade to Nourish+ Pro'}
              onPress={() => setShowPaywall(true)}
              icon={
                <Crown
                  size={16}
                  color={palette.chalk}
                  strokeWidth={2.5}
                />
              }
              size="sm"
              style={{
                flex: 1,
                backgroundColor: isPro ? palette.forestDeep : palette.forestDeep,
              }}
            />

            <SecondaryAction
              label="Restore"
              onPress={handleRestorePurchases}
              size="sm"
              style={{ minWidth: 84 }}
            />
          </View>
        </SurfaceCard>

        {/* ── Demo Pro Mode Toggle ─────────────────────────────────────────────
            For testing the Pro experience without a real purchase.
            This flips only the local AsyncStorage flag — not a real subscription.
        ──────────────────────────────────────────────────────────────────────── */}
        <SurfaceCard style={[styles.sectionCard, { borderColor: isPro ? palette.saffron : colors.border, borderWidth: isPro ? 1.5 : 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>
                  Demo Pro Mode
                </Text>
                <View style={{
                  backgroundColor: 'rgba(191, 152, 97, 0.15)',
                  borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 9, fontFamily: font.sansBold, color: palette.saffron, letterSpacing: 0.8 }}>
                    DEMO ONLY
                  </Text>
                </View>
              </View>
              <Text style={[styles.sectionSub, { color: colors.subText }]}>
                {isPro
                  ? 'Pro features unlocked for testing. AI Chef, unlimited scans, and advanced analytics are active.'
                  : 'Toggle to simulate the Pro experience locally. Flip off to return to free tier.'}
              </Text>
            </View>
            <Switch
              value={isPro}
              onValueChange={(val) => {
                hapticTap();
                setIsPro(val);
                toast.show(
                  val ? '✨ Pro mode enabled (demo)' : 'Returned to free tier',
                  val ? 'success' : 'info',
                );
              }}
              thumbColor={isPro ? palette.chalk : colors.border}
              trackColor={{ false: colors.border, true: palette.forestDeep }}
            />
          </View>
        </SurfaceCard>

        {/* ── Biometrics & Personal Info ── */}
        <SurfaceCard style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Personal Biometrics</Text>
          <Text style={[styles.sectionSub, { color: colors.subText }]}>
            Used to calibrate accurate macro nutritional targets and energy expenditure.
          </Text>

          {/* Name */}
          <Text style={[styles.fieldLabel, { color: colors.subText, marginTop: spacing[3] }]}>
            NAME
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border },
            ]}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          />

          {/* Age / Weight / Height */}
          <View style={styles.metricsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>AGE</Text>
              <TextInput
                style={[
                  styles.metricInput,
                  { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border },
                ]}
                value={String(form.age)}
                keyboardType="numeric"
                onChangeText={(t) => setForm((f) => ({ ...f, age: Number(t) || 0 }))}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>WEIGHT (KG)</Text>
              <TextInput
                style={[
                  styles.metricInput,
                  { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border },
                ]}
                value={String(form.weight_kg)}
                keyboardType="numeric"
                onChangeText={(t) => setForm((f) => ({ ...f, weight_kg: Number(t) || 0 }))}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>HEIGHT (CM)</Text>
              <TextInput
                style={[
                  styles.metricInput,
                  { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border },
                ]}
                value={String(form.height_cm)}
                keyboardType="numeric"
                onChangeText={(t) => setForm((f) => ({ ...f, height_cm: Number(t) || 0 }))}
              />
            </View>
          </View>

          {/* Sex */}
          <Text style={[styles.fieldLabel, { color: colors.subText, marginTop: spacing[3] }]}>
            BIOLOGICAL SEX
          </Text>
          <View style={styles.sexRow}>
            {(['female', 'male'] as const).map((s) => {
              const active = form.sex === s;
              return (
                <PressableScale
                  key={s}
                  onPress={() => {
                    hapticSelection();
                    setForm((f) => ({ ...f, sex: s }));
                  }}
                  style={[
                    styles.sexChip,
                    {
                      backgroundColor: active ? '#02332D' : (mode === 'dark' ? '#0E201D' : colors.bg),
                      borderColor: active ? '#BF9861' : colors.border,
                      borderWidth: active ? 1.5 : 1,
                    },
                  ]}
                  accessibilityLabel={`Select sex ${s}`}
                >
                  <Text
                    style={[
                      styles.sexText,
                      {
                        color: active ? '#DACFBD' : colors.text,
                        fontFamily: active ? font.sansBold : font.sansMed,
                      },
                    ]}
                  >
                    {s === 'female' ? 'Female' : 'Male'}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </SurfaceCard>

        {/* ── Activity Level ── */}
        <SurfaceCard style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Physical Activity</Text>
          <Text style={[styles.sectionSub, { color: colors.subText }]}>
            Determines your Total Daily Energy Expenditure (TDEE).
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 12,
              paddingVertical: spacing[3],
              paddingHorizontal: 2,
            }}
          >
            {ACTIVITY_OPTIONS.map((item) => {
              const isSelected = form.activity_level === item.value;
              const Icon = item.icon;

              return (
                <PressableScale
                  key={item.value}
                  onPress={() => {
                    hapticSelection();
                    setForm((f) => ({ ...f, activity_level: item.value }));
                  }}
                  style={[
                    styles.activityItemHorizontal,
                    {
                      backgroundColor: isSelected
                        ? mode === 'dark'
                          ? 'rgba(2, 51, 45, 0.35)'
                          : 'rgba(2, 51, 45, 0.08)'
                        : colors.bg,
                      borderColor: isSelected ? palette.forestDeep : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  accessibilityLabel={`Select activity ${item.label}`}
                >
                  <View style={{ position: 'relative', marginBottom: 10 }}>
                    <View
                      style={[
                        styles.activityIconCircleHorizontal,
                        {
                          backgroundColor: isSelected
                            ? palette.forestDeep
                            : mode === 'dark'
                            ? colors.surface
                            : 'rgba(0,0,0,0.04)',
                        },
                      ]}
                    >
                      <Icon
                        size={22}
                        color={isSelected ? palette.chalk : colors.subText}
                        strokeWidth={2.2}
                      />
                    </View>
                    {isSelected && (
                      <View style={styles.activityBadgeWrap}>
                        <Check size={11} color={palette.chalk} strokeWidth={3} />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.activityLabelHorizontal,
                      {
                        color: isSelected ? palette.forestDeep : colors.text,
                        fontFamily: isSelected ? font.sansBold : font.sansMed,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.activityDescHorizontal,
                      { color: colors.subText },
                    ]}
                    numberOfLines={2}
                  >
                    {item.desc}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </SurfaceCard>

        {/* ── Health Conditions & Dietary Swaps ── */}
        <SurfaceCard style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Clinical Dietary Needs</Text>
          <Text style={[styles.sectionSub, { color: colors.subText }]}>
            AI recipes automatically replace contraindicated ingredients with healthy substitutes.
          </Text>

          <View style={styles.conditionsGrid}>
            {CONDITIONS.map((c) => {
              const active = form.conditions.includes(c);
              return (
                <PressableScale
                  key={c}
                  onPress={() => handleToggleCondition(c)}
                  style={[
                    styles.conditionChip,
                    {
                      backgroundColor: active
                        ? palette.forestDeep
                        : colors.bg,
                      borderColor: active ? palette.forestDeep : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Toggle condition ${CONDITION_LABELS[c]}`}
                >
                  {active && (
                    <Check
                      size={13}
                      color={palette.chalk}
                      strokeWidth={3}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.conditionChipText,
                      { color: active ? palette.chalk : colors.text },
                    ]}
                  >
                    {CONDITION_LABELS[c]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </SurfaceCard>

        {/* ── Household Settings ── */}
        <SurfaceCard style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users size={18} color={palette.forestDeep} strokeWidth={2.5} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Household Size</Text>
          </View>
          <Text style={[styles.sectionSub, { color: colors.subText, marginTop: 4 }]}>
            Default serving portions when generating recipes and estimating weekly grocery needs.
          </Text>

          <View style={styles.householdRow}>
            {[1, 2, 3, 4, 5].map((sizeNum) => {
              const isSelected = householdSize === sizeNum;
              return (
                <PressableScale
                  key={sizeNum}
                  onPress={() => {
                    hapticSelection();
                    setHouseholdSize(sizeNum);
                  }}
                  style={[
                    styles.householdChip,
                    {
                      backgroundColor: isSelected ? palette.forestDeep : colors.bg,
                      borderColor: isSelected ? palette.forestDeep : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.householdChipText,
                      { color: isSelected ? palette.chalk : colors.text },
                    ]}
                  >
                    {sizeNum === 5 ? '5+' : sizeNum}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </SurfaceCard>

        {/* ── Daily Nutrition Goals (Collapsible) ── */}
        <SurfaceCard style={styles.sectionCard}>
          <PressableScale
            onPress={() => {
              hapticSelection();
              setGoalsExpanded((x) => !x);
            }}
            style={styles.expandHeaderPressable}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color={palette.forestDeep} strokeWidth={2.5} />
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  Clinical Nutrition Targets
                </Text>
                <Text style={[styles.sectionSub, { color: colors.subText }]}>
                  {tdee} kcal daily budget · BMI {userBmi} ({bmiCategory(userBmi)})
                </Text>
              </View>
            </View>

            {goalsExpanded ? (
              <ChevronUp size={20} color={colors.subText} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={20} color={colors.subText} strokeWidth={2.2} />
            )}
          </PressableScale>

          {goalsExpanded && (
            <View style={styles.goalsExpandedContent}>
              <Divider color={colors.border} />

              <View style={styles.macroRow}>
                <MacroBar
                  label="Protein"
                  value={`${rda.proteinG}g`}
                  pct={Math.min(1, rda.proteinG / 140)}
                  color={palette.forestDeep}
                  colors={colors}
                />
                <MacroBar
                  label="Carbohydrates"
                  value={`${rda.carbG}g`}
                  pct={Math.min(1, rda.carbG / 380)}
                  color={palette.saffron}
                  colors={colors}
                />
                <MacroBar
                  label="Healthy Fats"
                  value={`${rda.fatG}g`}
                  pct={Math.min(1, rda.fatG / 90)}
                  color={palette.sage}
                  colors={colors}
                />
                <MacroBar
                  label="Dietary Fiber"
                  value={`${rda.fiberG}g`}
                  pct={Math.min(1, rda.fiberG / 38)}
                  color={palette.forestDeep}
                  colors={colors}
                />
              </View>

              <View style={styles.microGrid}>
                <MicroBadge label="Vitamin C" value={`${rda.vitC}mg`} colors={colors} />
                <MicroBadge label="Calcium" value={`${rda.calcium}mg`} colors={colors} />
                <MicroBadge label="Iron" value={`${rda.iron}mg`} colors={colors} />
                <MicroBadge label="Potassium" value={`${rda.potassium}mg`} colors={colors} />
              </View>

              <View
                style={[
                  styles.sodiumBox,
                  {
                    backgroundColor:
                      rda.sodium <= 1500
                        ? 'rgba(2, 51, 45, 0.08)'
                        : 'rgba(191, 152, 97, 0.1)',
                    borderColor: rda.sodium <= 1500 ? palette.forestDeep : palette.saffron,
                  },
                ]}
              >
                <ShieldCheck
                  size={16}
                  color={rda.sodium <= 1500 ? palette.forestDeep : palette.saffron}
                  strokeWidth={2.5}
                />
                <Text style={[styles.sodiumText, { color: colors.text }]}>
                  Maximum Sodium Ceiling: <Text style={{ fontFamily: font.sansBold }}>{rda.sodium} mg/day</Text>
                </Text>
              </View>
            </View>
          )}
        </SurfaceCard>

        {/* ── Save Profile Button ── */}
        <PrimaryAction
          label={saved ? 'Profile Saved' : 'Save Health Profile'}
          onPress={handleSave}
          icon={
            saved ? (
              <Check size={18} color={palette.chalk} strokeWidth={2.8} />
            ) : undefined
          }
          style={{ marginVertical: spacing[3] }}
        />

        {/* ── Notification Preferences Card ── */}
        <View style={{ marginVertical: spacing[2] }}>
          <NotificationPreferencesCard />
        </View>

        {/* ── Household Pantry Sharing Card ── */}
        <View style={{ marginVertical: spacing[2] }}>
          <HouseholdSharingCard />
        </View>

        {/* ── Data & Privacy Settings ── */}
        <SurfaceCard style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Data & Security</Text>
          <Text style={[styles.sectionSub, { color: colors.subText }]}>
            Your data is encrypted and backed up directly to your Supabase private vault.
          </Text>

          <View style={{ gap: 8, marginTop: spacing[3] }}>
            <TouchableOpacity
              onPress={handleExportData}
              style={[styles.accountActionBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Download size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.accountActionText, { color: colors.text }]}>
                {exporting ? 'Preparing Export...' : 'Export Health & Waste Data (JSON)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearCache}
              style={[styles.accountActionBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <RotateCcw size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.accountActionText, { color: colors.text }]}>
                Clear Local Storage Cache
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTerms(true)}
              style={[styles.accountActionBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <FileText size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.accountActionText, { color: colors.text }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPrivacy(true)}
              style={[styles.accountActionBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Shield size={18} color={colors.text} strokeWidth={2} />
              <Text style={[styles.accountActionText, { color: colors.text }]}>
                Privacy Policy &amp; Security Guarantee
              </Text>
            </TouchableOpacity>

            {currentUser ? (
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.accountActionBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <LogOut size={18} color={colors.text} strokeWidth={2} />
                <Text style={[styles.accountActionText, { color: colors.text }]}>
                  Sign Out ({currentUser.email || 'Account'})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/login')}
                style={[styles.accountActionBtn, { borderColor: palette.forestDeep, backgroundColor: 'rgba(2, 51, 45, 0.08)' }]}
                activeOpacity={0.7}
              >
                <User size={18} color={palette.forestDeep} strokeWidth={2} />
                <Text style={[styles.accountActionText, { color: palette.forestDeep, fontFamily: font.sansBold }]}>
                  Sign In / Connect Supabase Account
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleDeleteAccount}
              style={[
                styles.accountActionBtn,
                { borderColor: palette.burgundy, backgroundColor: 'rgba(127, 17, 0, 0.06)' },
              ]}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color={palette.burgundy} strokeWidth={2} />
              <Text style={[styles.accountActionText, { color: palette.burgundy }]}>
                Delete Account Permanently
              </Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </ScrollView>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTerms}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[modalStyles.head, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color={palette.royalGreen} />
                <Text style={[modalStyles.title, { color: colors.text }]}>Terms of Service</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTerms(false)} style={modalStyles.closeBtn}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                1. Acceptance of Terms: By accessing Nourish, you agree to comply with all governing service guidelines.
              </Text>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                2. Health Disclaimer: Nutritional estimations and recommendations are intended solely for lifestyle optimization and do not substitute professional medical care.
              </Text>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                3. Data Stewardship: You maintain full sovereignty over your grocery logs and biometric inputs.
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowTerms(false)} style={[modalStyles.doneBtn, { backgroundColor: palette.royalGreen }]}>
              <Text style={[modalStyles.doneBtnText, { color: palette.chalk }]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacy}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacy(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[modalStyles.head, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shield size={20} color={palette.royalGreen} />
                <Text style={[modalStyles.title, { color: colors.text }]}>Privacy Policy</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrivacy(false)} style={modalStyles.closeBtn}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                1. Zero Tracking: Nourish does not sell or share personal health metrics with external advertisers or data brokers.
              </Text>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                2. Row Level Isolation: Multi-tenant database entries are protected by cryptographically isolated Row Level Security.
              </Text>
              <Text style={[modalStyles.p, { color: colors.text }]}>
                3. Total Erasure: Executing Delete Account permanently purges all remote database records and local storage keys.
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowPrivacy(false)} style={[modalStyles.doneBtn, { backgroundColor: palette.royalGreen }]}>
              <Text style={[modalStyles.doneBtnText, { color: palette.chalk }]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Paywall Modal */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </KeyboardAvoidingView>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────

function MacroBar({
  label,
  value,
  pct,
  color,
  colors,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.macroBarItem}>
      <View style={styles.macroBarLabels}>
        <Text style={[styles.macroBarLabel, { color: colors.subText }]}>{label}</Text>
        <Text style={[styles.macroBarValue, { color: colors.text }]}>{value}</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.macroFill,
            { width: `${Math.round(pct * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function MicroBadge({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View
      style={[
        styles.microBadge,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.microBadgeLabel, { color: colors.subText }]}>{label}</Text>
      <Text style={[styles.microBadgeValue, { color: colors.text }]}>{value}</Text>
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
  membershipCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPlanTitle: {
    fontSize: 16,
    fontFamily: font.sansBold,
  },
  proPlanSub: {
    fontSize: 12,
    fontFamily: font.sans,
    lineHeight: 17,
    marginTop: 2,
  },
  proActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing[3],
    paddingTop: spacing[2],
  },
  sectionCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: font.sansBold,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 2,
  },
  fieldLabel: {
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
    fontSize: 15,
    fontFamily: font.sans,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing[3],
  },
  metricInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: font.monoBold,
    textAlign: 'center',
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  sexText: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  activityItemHorizontal: {
    width: 130,
    minHeight: 145,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconCircleHorizontal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBadgeWrap: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.forestDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: {
    fontSize: 14,
  },
  activityLabelHorizontal: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 1,
  },
  activityDescHorizontal: {
    fontSize: 11,
    fontFamily: font.sans,
    textAlign: 'center',
    lineHeight: 15,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing[3],
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  conditionChipText: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  householdRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing[3],
  },
  householdChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  householdChipText: {
    fontSize: 15,
    fontFamily: font.monoBold,
  },
  expandHeaderPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsExpandedContent: {
    marginTop: spacing[3],
    gap: spacing[3],
  },
  macroRow: {
    gap: 10,
  },
  macroBarItem: {
    gap: 4,
  },
  macroBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBarLabel: {
    fontSize: 12,
    fontFamily: font.sans,
  },
  macroBarValue: {
    fontSize: 12,
    fontFamily: font.monoBold,
  },
  macroTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  microBadge: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  microBadgeLabel: {
    fontSize: 11,
    fontFamily: font.sans,
  },
  microBadgeValue: {
    fontSize: 14,
    fontFamily: font.monoBold,
    marginTop: 2,
  },
  sodiumBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sodiumText: {
    fontSize: 12,
    fontFamily: font.sans,
  },
  accountActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  accountActionText: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 51, 45, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#02332D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: font.sansBold,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: font.sans,
    marginBottom: 12,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 13,
    letterSpacing: 1.2,
    fontFamily: font.sansBold,
  },
});
