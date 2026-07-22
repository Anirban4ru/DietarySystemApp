import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { User, Check, Sun, Moon, LogOut, Trash2, ChevronDown, ChevronUp, Activity } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font, border } from '@/lib/theme';
import { Bar, Divider, BrutalButton, useTheme, useToast } from '@/components/ui';
import { MacroRings } from '@/components/ui/MacroRings';
import { useProfile, useInventory, useImpact } from '@/lib/hooks';
import { computeRDA, computeTDEE, bmi, bmiCategory, CONDITION_LABELS } from '@/lib/rda';
import { Condition } from '@/lib/types';
import { summarizeImpact } from '@/lib/impact';
import { supabase } from '@/lib/supabase';

const ACTIVITY_OPTIONS: { value: any; label: string; emoji: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',   emoji: '🛋️' },
  { value: 'light',       label: 'Light',        emoji: '🚶' },
  { value: 'moderate',    label: 'Moderate',     emoji: '🏃' },
  { value: 'active',      label: 'Active',       emoji: '⚡' },
  { value: 'very_active', label: 'Very Active',  emoji: '🔥' },
];

const CONDITIONS: Condition[] = ['hypertension', 'diabetes', 'celiac', 'lactose_intolerant'];

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const { profile, upsert } = useProfile();
  const { items } = useInventory();
  const { log } = useImpact();
  const [form, setForm] = useState({
    name: '', age: 30, sex: 'female' as 'male' | 'female', weight_kg: 70, height_cm: 170,
    activity_level: 'moderate' as any, conditions: [] as Condition[],
  });
  const [saved, setSaved] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  useMemo(() => {
    if (profile) {
      setForm({
        name: profile.name || '', age: profile.age, sex: profile.sex, weight_kg: profile.weight_kg,
        height_cm: profile.height_cm, activity_level: profile.activity_level,
        conditions: profile.conditions,
      });
    }
  }, [profile]);

  const rda = useMemo(() => computeRDA({ ...form, id: '', updated_at: '' } as any), [form]);
  const tdee = computeTDEE({ ...form, id: '', updated_at: '' } as any);
  const b = bmi(form);
  const summary = useMemo(() => summarizeImpact(log), [log]);

  const save = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await upsert(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    show('Permanently delete account?', 'error', {
      label: 'DELETE',
      onPress: async () => {
        try {
          const { error } = await supabase.rpc('delete_user');
          if (error) throw error;
          await supabase.auth.signOut();
        } catch (e: any) {
          show(e.message || 'Could not delete account', 'error');
        }
      }
    });
  };

  const toggleCondition = (c: Condition) => {
    Haptics.selectionAsync();
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c],
    }));
  };

  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>
            <Text style={[styles.screenSub, { color: colors.subText }]}>Personalise your nutrition goals</Text>
          </View>
          <TouchableOpacity
            style={[styles.modeToggle, { backgroundColor: isDark ? palette.ink : palette.chalk, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }}
            activeOpacity={0.8}
          >
            {isDark
              ? <Sun size={18} color={palette.chalk} strokeWidth={2.5} />
              : <Moon size={18} color={palette.ink} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatBox label="In Pantry" value={items.length} accent={palette.sageDeep} colors={colors} />
          <StatBox label="Meals Saved" value={summary.mealsRescued} accent={palette.clayDeep} colors={colors} />
          <StatBox label="CO₂ Saved" value={`${summary.totalCo2eAvoided.toFixed(1)}kg`} accent={palette.amberDeep} colors={colors} />
        </View>

        {/* ── About You ── */}
        <SectionLabel title="About You" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Name */}
          <Text style={[styles.fieldLabel, { color: colors.subText }]}>NAME</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }]}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Your name"
            placeholderTextColor={colors.subText}
          />

          {/* Age / Weight / Height */}
          <View style={styles.numRow}>
            <NumField
              label="AGE"
              value={form.age}
              onChange={(v) => setForm((f) => ({ ...f, age: v }))}
              colors={colors}
            />
            <NumField
              label="WEIGHT (KG)"
              value={form.weight_kg}
              onChange={(v) => setForm((f) => ({ ...f, weight_kg: v }))}
              colors={colors}
            />
            <NumField
              label="HEIGHT (CM)"
              value={form.height_cm}
              onChange={(v) => setForm((f) => ({ ...f, height_cm: v }))}
              colors={colors}
            />
          </View>

          {/* Sex */}
          <Text style={[styles.fieldLabel, { color: colors.subText, marginTop: 16 }]}>SEX</Text>
          <View style={styles.segRow}>
            {(['female', 'male'] as const).map((s) => {
              const active = form.sex === s;
              return (
                <TouchableOpacity
                  key={s}
                  activeOpacity={0.8}
                  style={[
                    styles.segChip,
                    {
                      backgroundColor: active ? palette.sageDeep : colors.bg,
                      borderColor: active ? palette.sageDeep : colors.border,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, sex: s })); }}
                >
                  <Text style={[styles.segText, { color: active ? palette.chalk : colors.text }]}>
                    {s === 'female' ? '♀ Female' : '♂ Male'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Activity Level ── */}
        <SectionLabel title="Activity Level" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.activityGrid}>
            {ACTIVITY_OPTIONS.map((a) => {
              const active = form.activity_level === a.value;
              return (
                <TouchableOpacity
                  key={a.value}
                  activeOpacity={0.8}
                  style={[
                    styles.activityChip,
                    {
                      backgroundColor: active ? palette.ink : colors.bg,
                      borderColor: active ? palette.ink : colors.border,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, activity_level: a.value })); }}
                >
                  <Text style={styles.activityEmoji}>{a.emoji}</Text>
                  <Text style={[styles.activityText, { color: active ? palette.chalk : colors.text }]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Health Conditions ── */}
        <SectionLabel title="Health Conditions" subtitle="Recipes will auto-swap unsafe ingredients" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.condGrid}>
            {CONDITIONS.map((c) => {
              const active = form.conditions.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.8}
                  style={[
                    styles.condChip,
                    {
                      backgroundColor: active ? palette.sageDeep : colors.bg,
                      borderColor: active ? palette.sageDeep : colors.border,
                    },
                  ]}
                  onPress={() => toggleCondition(c)}
                >
                  {active && <Check size={13} color={palette.chalk} strokeWidth={2.8} style={{ marginRight: 5 }} />}
                  <Text style={[styles.condText, { color: active ? palette.chalk : colors.text }]}>
                    {CONDITION_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Daily Goals (Collapsible) ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.goalsToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); setGoalsExpanded((x) => !x); }}
        >
          <View style={styles.goalsToggleLeft}>
            <Activity size={16} color={palette.sageDeep} strokeWidth={2.5} />
            <Text style={[styles.goalsToggleText, { color: colors.text }]}>Your Daily Nutrition Goals</Text>
          </View>
          {goalsExpanded
            ? <ChevronUp size={18} color={colors.subText} strokeWidth={2.5} />
            : <ChevronDown size={18} color={colors.subText} strokeWidth={2.5} />}
        </TouchableOpacity>

        {goalsExpanded && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            {/* Calories + BMI hero */}
            <View style={styles.heroRow}>
              <View style={styles.heroCell}>
                <Text style={[styles.heroNum, { color: colors.text }]}>{tdee}</Text>
                <Text style={[styles.heroLabel, { color: colors.subText }]}>kcal / day</Text>
              </View>
              <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
              <View style={styles.heroCell}>
                <Text style={[styles.heroNum, { color: b < 18.5 || b >= 25 ? palette.warning : palette.sageDeep }]}>{b}</Text>
                <Text style={[styles.heroLabel, { color: colors.subText }]}>BMI · {bmiCategory(b)}</Text>
              </View>
            </View>

            <Divider color={colors.border} />

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[2] }}>
              <MacroRings 
                proteinPct={Math.min(1, rda.proteinG / 120)} 
                carbsPct={Math.min(1, rda.carbsG / 400 || rda.carbG / 400)} 
                fatPct={Math.min(1, rda.fatG / 100)} 
                proteinColor={palette.sageDeep} 
                carbsColor={palette.clayDeep} 
                fatColor={palette.amberDeep} 
                size={140} 
              />
              <View style={{ marginLeft: spacing[5], flex: 1, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.sageDeep }} />
                    <Text style={[styles.goalLabel, { color: colors.subText, width: 'auto' }]}>Protein</Text>
                  </View>
                  <Text style={[styles.goalValue, { color: colors.text, width: 'auto' }]}>{rda.proteinG}g</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.clayDeep }} />
                    <Text style={[styles.goalLabel, { color: colors.subText, width: 'auto' }]}>Carbs</Text>
                  </View>
                  <Text style={[styles.goalValue, { color: colors.text, width: 'auto' }]}>{rda.carbG || rda.carbsG}g</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.amberDeep }} />
                    <Text style={[styles.goalLabel, { color: colors.subText, width: 'auto' }]}>Fat</Text>
                  </View>
                  <Text style={[styles.goalValue, { color: colors.text, width: 'auto' }]}>{rda.fatG}g</Text>
                </View>
              </View>
            </View>

            <Divider color={colors.border} />
            <GoalBar label="Fiber"   value={`${rda.fiberG}g`}   pct={Math.min(1, rda.fiberG / 35)}    color={palette.slate2}    colors={colors} />
            <Divider color={colors.border} />

            <View style={styles.microRow}>
              <MicroCell label="Vit C"     value={`${rda.vitC}mg`}      colors={colors} />
              <MicroCell label="Calcium"   value={`${rda.calcium}mg`}   colors={colors} />
              <MicroCell label="Iron"      value={`${rda.iron}mg`}      colors={colors} />
              <MicroCell label="Potassium" value={`${rda.potassium}mg`} colors={colors} />
            </View>

            <View style={[styles.sodiumRow, { borderColor: colors.border }]}>
              <Text style={[styles.sodiumLabel, { color: colors.subText }]}>Max sodium</Text>
              <Text style={[styles.sodiumValue, { color: rda.sodium <= 1500 ? palette.sageDeep : palette.warning }]}>{rda.sodium} mg</Text>
            </View>
          </View>
        )}

        {/* ── Save Button ── */}
        <BrutalButton variant="sage" onPress={save} style={{ marginTop: spacing[5] }}>
          {saved && <Check size={16} color={palette.chalk} strokeWidth={2.8} style={{ marginRight: 8 }} />}
          <Text style={[type.label, { color: palette.chalk }]}>{saved ? '✓ SAVED!' : 'SAVE PROFILE'}</Text>
        </BrutalButton>

        {/* ── Account Actions ── */}
        <View style={[styles.accountBox, { borderColor: colors.border }]}>
          <Text style={[styles.accountLabel, { color: colors.subText }]}>ACCOUNT</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.accountRow, { borderColor: colors.border }]}
            onPress={handleLogout}
          >
            <LogOut size={18} color={colors.text} strokeWidth={2.5} />
            <Text style={[styles.accountRowText, { color: colors.text }]}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.accountRow, { borderColor: 'transparent' }]}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={18} color={palette.danger} strokeWidth={2.5} />
            <Text style={[styles.accountRowText, { color: palette.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SectionLabel({ title, subtitle, colors }: { title: string; subtitle?: string; colors: any }) {
  return (
    <View style={{ marginBottom: 8, marginTop: 20 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSub, { color: colors.subText }]}>{subtitle}</Text>}
    </View>
  );
}

function StatBox({ label, value, accent, colors }: { label: string; value: any; accent: string; colors: any }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
}

function NumField({ label, value, onChange, colors }: { label: string; value: number; onChange: (v: number) => void; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.subText }]}>{label}</Text>
      <TextInput
        style={[styles.numInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }]}
        value={String(value)}
        keyboardType="numeric"
        onChangeText={(t) => onChange(Number(t) || 0)}
      />
    </View>
  );
}

function GoalBar({ label, value, pct, color, colors }: { label: string; value: string; pct: number; color: string; colors: any }) {
  return (
    <View style={styles.goalBarRow}>
      <Text style={[styles.goalLabel, { color: colors.subText }]}>{label}</Text>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Bar value={pct} color={color} track={colors.border} />
      </View>
      <Text style={[styles.goalValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function MicroCell({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.microCell, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <Text style={[styles.microValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.microLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:        { flex: 1 },
  scroll:           { flex: 1, paddingHorizontal: spacing[4] },

  // Header
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  screenTitle:      { fontSize: 28, fontFamily: font.sansBold, letterSpacing: -0.5 },
  screenSub:        { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  modeToggle:       { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow:         { flexDirection: 'row', gap: 10, marginBottom: spacing[2] },
  statBox:          { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: spacing[3], alignItems: 'center' },
  statValue:        { fontSize: 22, fontFamily: font.sansBold, letterSpacing: -0.5 },
  statLabel:        { fontSize: 11, fontFamily: font.sans, marginTop: 3, textAlign: 'center' },

  // Section label
  sectionTitle:     { fontSize: 15, fontFamily: font.sansBold, letterSpacing: 0.2 },
  sectionSub:       { fontSize: 12, fontFamily: font.sans, marginTop: 2 },

  // Card
  card:             { borderWidth: 1.5, borderRadius: 16, padding: spacing[4], marginBottom: spacing[3] },

  // Form
  fieldLabel:       { fontSize: 11, fontFamily: font.sansBold, letterSpacing: 0.8, marginBottom: 6 },
  textInput:        { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: font.sans },
  numRow:           { flexDirection: 'row', gap: 10, marginTop: 14 },
  numInput:         { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, fontFamily: font.sans, textAlign: 'center', marginTop: 6 },

  // Sex
  segRow:           { flexDirection: 'row', gap: 10 },
  segChip:          { flex: 1, paddingVertical: 12, borderWidth: 1.5, borderRadius: 12, alignItems: 'center' },
  segText:          { fontSize: 14, fontFamily: font.sansBold },

  // Activity
  activityGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityChip:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 12, gap: 6 },
  activityEmoji:    { fontSize: 15 },
  activityText:     { fontSize: 13, fontFamily: font.sansBold },

  // Conditions
  condGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 12 },
  condText:         { fontSize: 13, fontFamily: font.sansBold },

  // Goals toggle
  goalsToggle:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: spacing[4], marginTop: 20 },
  goalsToggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalsToggleText:  { fontSize: 14, fontFamily: font.sansBold },

  // Goals hero
  heroRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  heroCell:         { flex: 1, alignItems: 'center' },
  heroNum:          { fontSize: 30, fontFamily: font.sansBold, letterSpacing: -1 },
  heroLabel:        { fontSize: 12, fontFamily: font.sans, marginTop: 4 },
  heroDivider:      { width: 1, height: 50, marginHorizontal: 12 },

  // Goal bars
  goalBarRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  goalLabel:        { width: 52, fontSize: 13, fontFamily: font.sans },
  goalValue:        { width: 52, fontSize: 13, fontFamily: font.sansBold, textAlign: 'right' },

  // Micros
  microRow:         { flexDirection: 'row', gap: 8, marginVertical: spacing[3] },
  microCell:        { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  microValue:       { fontSize: 13, fontFamily: font.sansBold },
  microLabel:       { fontSize: 10, fontFamily: font.sans, marginTop: 3 },

  // Sodium
  sodiumRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: spacing[3] },
  sodiumLabel:      { fontSize: 13, fontFamily: font.sans },
  sodiumValue:      { fontSize: 18, fontFamily: font.sansBold },

  // Account section
  accountBox:       { borderWidth: 1.5, borderRadius: 16, marginTop: spacing[5], overflow: 'hidden' },
  accountLabel:     { fontSize: 10, fontFamily: font.sansBold, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  accountRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  accountRowText:   { fontSize: 15, fontFamily: font.sansBold },
});
