import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { User, Check, Sun, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { Label, Pill, Bar, Divider, BrutalButton, GlassPanel, SectionHeader, useTheme } from '@/components/ui';
import { useProfile, useInventory, useImpact } from '@/lib/hooks';
import { computeRDA, computeTDEE, bmi, bmiCategory, CONDITION_LABELS } from '@/lib/rda';
import { Condition } from '@/lib/types';
import { summarizeImpact } from '@/lib/impact';

const ACTIVITY_OPTIONS: { value: any; label: string }[] = [
  { value: 'sedentary', label: 'Not active' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very active' },
];

const CONDITIONS: Condition[] = ['hypertension', 'diabetes', 'celiac', 'lactose_intolerant'];

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, upsert } = useProfile();
  const { items } = useInventory();
  const { log } = useImpact();
  const [form, setForm] = useState({
    age: 30, sex: 'female' as 'male' | 'female', weight_kg: 70, height_cm: 170,
    activity_level: 'moderate' as any, conditions: [] as Condition[],
  });
  const [saved, setSaved] = useState(false);

  useMemo(() => {
    if (profile) {
      setForm({
        age: profile.age, sex: profile.sex, weight_kg: profile.weight_kg,
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

  const toggleCondition = (c: Condition) => {
    Haptics.selectionAsync();
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c],
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={[type.display, { color: colors.text }]}>Profile</Text>
          <Text style={[type.body, { color: colors.subText }]}>Your nutrition goals are calculated from this</Text>
          <TouchableOpacity style={[styles.darkToggle, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }}>
            {mode === 'dark' ? <Sun size={16} color={colors.text} strokeWidth={2.5} /> : <Moon size={16} color={colors.text} strokeWidth={2.5} />}
            <Text style={[type.monoBold, { color: colors.text, marginLeft: 6, fontSize: 10 }]}>{mode === 'dark' ? 'LIGHT' : 'DARK'} MODE</Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatBox label="In pantry" value={items.length} color={colors.text} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
          <StatBox label="Meals saved" value={summary.mealsRescued} color={colors.text} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
          <StatBox label="CO2 saved" value={`${summary.totalCo2eAvoided.toFixed(1)}kg`} color={palette.sageDeep} subColor={colors.subText} borderColor={colors.border} bg={colors.surface} />
        </View>

        {/* About you */}
        <SectionHeader title="About You" colors={colors} />
        <GlassPanel style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Field label="Age" colors={colors}>
              <NumInput value={form.age} onChange={(v) => setForm((f) => ({ ...f, age: v }))} colors={colors} />
            </Field>
            <Field label="Weight (kg)" colors={colors}>
              <NumInput value={form.weight_kg} onChange={(v) => setForm((f) => ({ ...f, weight_kg: v }))} colors={colors} />
            </Field>
            <Field label="Height (cm)" colors={colors}>
              <NumInput value={form.height_cm} onChange={(v) => setForm((f) => ({ ...f, height_cm: v }))} colors={colors} />
            </Field>
          </View>

          <Text style={[type.body, { color: colors.subText, marginTop: spacing[4] }]}>Sex</Text>
          <View style={styles.segmentRow}>
            {(['female', 'male'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.segment, { borderColor: colors.border }, form.sex === s && { backgroundColor: palette.sageDeep, borderColor: palette.sageDeep }]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, sex: s })); }}
              >
                <Text style={[type.body, { color: form.sex === s ? palette.chalk : colors.text, textTransform: 'capitalize', fontFamily: font.sansBold }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassPanel>

        {/* Activity */}
        <SectionHeader title="Activity Level" colors={colors} />
        <GlassPanel style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.activityGrid}>
            {ACTIVITY_OPTIONS.map((a) => (
              <TouchableOpacity
                key={a.value}
                style={[styles.activityCell, { borderColor: colors.border }, form.activity_level === a.value && { backgroundColor: palette.sageDeep, borderColor: palette.sageDeep }]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, activity_level: a.value })); }}
              >
                <Text style={[type.bodySm, { color: form.activity_level === a.value ? palette.chalk : colors.text, fontFamily: font.sansBold }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassPanel>

        {/* Health conditions */}
        <SectionHeader title="Health Conditions" subtitle="Recipes auto-swap ingredients that don't fit" colors={colors} />
        <GlassPanel style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.condGrid}>
            {CONDITIONS.map((c) => {
              const active = form.conditions.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.condChip, { borderColor: active ? palette.sageDeep : colors.border, backgroundColor: active ? palette.sageMist : colors.bg }]}
                  onPress={() => toggleCondition(c)}
                >
                  {active && <Check size={14} color={palette.sageDeep} strokeWidth={2.5} />}
                  <Text style={[type.body, { color: active ? palette.sageDeep : colors.text, marginLeft: active ? 6 : 0, fontFamily: font.sansBold }]}>
                    {CONDITION_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassPanel>

        {/* Your goals */}
        <SectionHeader title="Your Daily Goals" colors={colors} />
        <GlassPanel style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.rdaHero}>
            <View>
              <Text style={[type.bodySm, { color: colors.subText }]}>Calories</Text>
              <Text style={[type.h1, { fontSize: 32, color: colors.text }]}>{tdee}</Text>
              <Text style={[type.bodySm, { color: colors.subText }]}>per day</Text>
            </View>
            <View style={styles.bmiBox}>
              <Text style={[type.bodySm, { color: colors.subText }]}>BMI</Text>
              <Text style={[type.h1, { fontSize: 32, color: colors.text }]}>{b}</Text>
              <Pill tone={b < 18.5 || b >= 25 ? 'warning' : 'success'}>{bmiCategory(b)}</Pill>
            </View>
          </View>
          <Divider color={colors.border} />
          <GoalBar label="Protein" value={`${rda.proteinG}g`} pct={Math.min(1, rda.proteinG / 120)} color={palette.sageDeep} colors={colors} />
          <GoalBar label="Carbs" value={`${rda.carbG}g`} pct={Math.min(1, rda.carbG / 400)} color={palette.clayDeep} colors={colors} />
          <GoalBar label="Fat" value={`${rda.fatG}g`} pct={Math.min(1, rda.fatG / 100)} color={palette.warning} colors={colors} />
          <GoalBar label="Fiber" value={`${rda.fiberG}g`} pct={Math.min(1, rda.fiberG / 35)} color={palette.slate2} colors={colors} />
          <Divider color={colors.border} />
          <View style={styles.microRow}>
            <MicroCell label="Vit C" value={`${rda.vitC}mg`} colors={colors} />
            <MicroCell label="Calcium" value={`${rda.calcium}mg`} colors={colors} />
            <MicroCell label="Iron" value={`${rda.iron}mg`} colors={colors} />
            <MicroCell label="Potassium" value={`${rda.potassium}mg`} colors={colors} />
          </View>
          <View style={styles.sodiumRow}>
            <Text style={[type.body, { color: colors.subText }]}>Max sodium</Text>
            <Text style={[type.h2, { color: rda.sodium <= 1500 ? palette.sageDeep : palette.warning }]}>{rda.sodium}mg</Text>
          </View>
        </GlassPanel>

        <BrutalButton variant={saved ? 'sage' : 'sage'} onPress={save} style={{ marginTop: spacing[4] }}>
          {saved && <Check size={16} color={palette.chalk} style={{ marginRight: 8 }} />}
          <Text style={[type.label, { color: palette.chalk }]}>{saved ? 'SAVED' : 'SAVE PROFILE'}</Text>
        </BrutalButton>
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color, subColor, borderColor, bg }: { label: string; value: any; color: string; subColor: string; borderColor: string, bg: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, borderColor, padding: spacing[3], backgroundColor: bg }}>
      <Text style={[type.h1, { color }]}>{value}</Text>
      <Text style={[type.bodySm, { color: subColor, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

function Field({ label, colors, children }: { label: string; colors: any; children: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.bodySm, { color: colors.subText, fontFamily: font.sansBold }]}>{label.toUpperCase()}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}

function NumInput({ value, onChange, colors }: { value: number; onChange: (v: number) => void; colors: any }) {
  return (
    <TextInput
      style={[styles.numInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
      value={String(value)}
      keyboardType="numeric"
      onChangeText={(t) => onChange(Number(t) || 0)}
    />
  );
}

function GoalBar({ label, value, pct, color, colors }: { label: string; value: string; pct: number; color: string; colors: any }) {
  return (
    <View style={styles.goalBarRow}>
      <Text style={[type.body, { color: colors.text, width: 70 }]}>{label}</Text>
      <View style={{ flex: 1, marginHorizontal: 8 }}>
        <Bar value={pct} color={color} track={colors.border} />
      </View>
      <Text style={[type.monoBold, { color: colors.text, width: 50, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

function MicroCell({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, borderColor: colors.border, backgroundColor: colors.bg, paddingVertical: spacing[3] }}>
      <Text style={[type.h2, { fontSize: 16, color: colors.text }]}>{value}</Text>
      <Text style={[type.bodySm, { color: colors.subText, fontSize: 11, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing[4] },
  header: { marginBottom: spacing[4], marginTop: spacing[3] },
  darkToggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2], alignSelf: 'flex-start', marginTop: spacing[3] },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing[4] },
  card: { borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  row: { flexDirection: 'row', gap: 12 },
  numInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontFamily: font.sans, fontSize: 16 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segment: { flex: 1, paddingVertical: spacing[3], borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityCell: { width: '31%', paddingVertical: spacing[3], borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1, borderRadius: 12 },
  rdaHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bmiBox: { alignItems: 'flex-end', gap: 4 },
  goalBarRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  microRow: { flexDirection: 'row', marginVertical: spacing[3], gap: 8 },
  sodiumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[3] },
});
