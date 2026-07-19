import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Leaf, Check, AlertCircle, ChefHat, Heart, ShoppingCart, X } from 'lucide-react-native';
import { palette, type, spacing, font, border } from '@/lib/theme';
import { GlassPanel, Label, Pill, Bar, Divider, BrutalButton, BrutalPanel, SectionHeader, useTheme } from '@/components/ui';
import { useInventory, useProfile, useImpact, useFavorites, useShoppingList, useXp } from '@/lib/hooks';
import { optimizeRecipes, RecipeCandidate, OptimizerWeights } from '@/lib/optimizer';
import { computeRDA, RDA } from '@/lib/rda';
import { FOOD_BY_NAME } from '@/lib/foodCatalog';
import { co2eAvoidedForMeal } from '@/lib/impact';
import { xpForMeal, getPairings } from '@/lib/features';

export default function RecipesScreen() {
  const { colors } = useTheme();
  const { items } = useInventory();
  const { profile } = useProfile();
  const { logEvent } = useImpact();
  const { favs, toggle: toggleFav } = useFavorites();
  const { addItems: addShopping } = useShoppingList();
  const { addXp } = useXp();
  const [weights, setWeights] = useState<OptimizerWeights>({ waste: 0.5, rda: 0.3, completeness: 0.2 });
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeCandidate | null>(null);

  const rda: RDA = useMemo(() => computeRDA(profile ?? {
    id: '', age: 30, sex: 'female', weight_kg: 70, height_cm: 170,
    activity_level: 'moderate', conditions: [], updated_at: '',
  }), [profile]);

  const inventoryMap = useMemo(() => {
    const m = new Map<string, { grams: number; daysLeft: number; freshness: number }>();
    for (const row of items) {
      const food = FOOD_BY_NAME[row.name.toLowerCase()];
      const grams = food ? row.quantity * 120 : 150;
      const d = row.expires_at ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000) : 999;
      m.set(row.name.toLowerCase(), { grams, daysLeft: d, freshness: row.freshness_score ?? 1 });
    }
    return m;
  }, [items]);

  const recipes = useMemo(
    () => optimizeRecipes(inventoryMap, rda, profile?.conditions ?? [], weights),
    [inventoryMap, rda, profile, weights],
  );

  const cook = async (c: RecipeCandidate) => {
    const avoided = co2eAvoidedForMeal(c.co2eKg);
    await logEvent('rescue_meal', avoided, { recipe: c.name });
    await addXp(xpForMeal(avoided));
    setSelected(c.name);
    setTimeout(() => setSelected(null), 2000);
  };

  const addToShopping = async (c: RecipeCandidate) => {
    const missing = c.missing.map((name) => {
      const food = FOOD_BY_NAME[name.toLowerCase()];
      return { item_name: name, category: food?.category ?? 'other', quantity: 1 };
    });
    await addShopping(missing);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[type.display, { color: colors.text }]}>Recipes</Text>
        <Text style={[type.body, { color: colors.subText }]}>Meals that use what you have before it expires</Text>
      </View>

      {/* Priority sliders — simplified */}
      <BrutalPanel style={styles.controls}>
        <Text style={[type.h2, { color: colors.text, marginBottom: spacing[3] }]}>What matters most?</Text>
        <Slider label="Use expiring food first" value={weights.waste} onChange={(v) => setWeights((w) => ({ ...w, waste: v }))} color={palette.sageDeep} colors={colors} />
        <Slider label="Match my nutrition goals" value={weights.rda} onChange={(v) => setWeights((w) => ({ ...w, rda: v }))} color={palette.clayDeep} colors={colors} />
        <Slider label="Use what I already have" value={weights.completeness} onChange={(v) => setWeights((w) => ({ ...w, completeness: v }))} color={palette.amberDeep} colors={colors} />
      </BrutalPanel>

      {items.length === 0 && (
        <BrutalPanel style={styles.empty}>
          <ChefHat size={32} color={palette.sageDeep} strokeWidth={2.5} />
          <Text style={[type.h2, { marginTop: spacing[3], color: colors.text }]}>Add food first</Text>
          <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2] }]}>
            Once you have items in your pantry, recipes appear here automatically.
          </Text>
        </BrutalPanel>
      )}

      {recipes.map((c, i) => (
        <RecipeCard
          key={c.name}
          c={c}
          index={i}
          selected={selected === c.name}
          isFav={favs.includes(c.name)}
          onCook={() => cook(c)}
          onFav={() => toggleFav(c.name)}
          onShop={() => addToShopping(c)}
          onDetail={() => setDetail(c)}
          colors={colors}
        />
      ))}

      <RecipeDetail c={detail} onClose={() => setDetail(null)} onCook={cook} colors={colors} />
    </ScrollView>
  );
}

function Slider({ label, value, onChange, color, colors }: { label: string; value: number; onChange: (v: number) => void; color: string; colors: any }) {
  const labels = ['Low', '', 'Medium', '', 'High'];
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHead}>
        <Text style={[type.bodySm, { color: colors.text }]}>{label}</Text>
        <Text style={[type.monoBold, { color }]}>{labels[Math.round(value * 4)]}</Text>
      </View>
      <View style={styles.sliderTrack}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <TouchableOpacity key={v} style={styles.sliderTick} onPress={() => onChange(v)}>
            <View style={[styles.sliderDot, value >= v && { backgroundColor: color, borderColor: color }]} />
          </TouchableOpacity>
        ))}
        <View style={[styles.sliderFill, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RecipeCard({ c, index, selected, isFav, onCook, onFav, onShop, onDetail, colors }: {
  c: RecipeCandidate; index: number; selected: boolean; isFav: boolean;
  onCook: () => void; onFav: () => void; onShop: () => void; onDetail: () => void; colors: any;
}) {
  const missingCount = c.missing.length;
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.cardHead}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onDetail}>
          <Text style={[type.h1, { color: colors.text, fontSize: 22 }]}>{c.name}</Text>
          <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
            {c.ingredients.length} ingredients · {Math.round(c.nutrition.kcal)} cal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onFav} style={styles.favBtn}>
          <Heart size={20} color={isFav ? palette.crimson : colors.subText} fill={isFav ? palette.crimson : 'none'} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Simple score row */}
      <View style={styles.scoreRow}>
        <ScoreChip label="Waste rescue" value={c.wasteScore} color={palette.sageDeep} colors={colors} />
        <ScoreChip label="Nutrition" value={c.rdaScore} color={palette.clayDeep} colors={colors} />
        <ScoreChip label="In stock" value={c.completeness} color={palette.amberDeep} colors={colors} />
      </View>

      {/* Missing ingredients notice */}
      {missingCount > 0 && (
        <View style={[styles.noticeBox, { borderColor: palette.amberDeep, backgroundColor: '#F5EDD8' }]}>
          <AlertCircle size={14} color={palette.amberDeep} strokeWidth={2.5} />
          <Text style={[type.bodySm, { flex: 1, marginLeft: 6, color: palette.ink }]}>
            {missingCount} ingredient{missingCount > 1 ? 's' : ''} missing — tap to see or add to shopping list
          </Text>
        </View>
      )}

      {/* Substitutions notice */}
      {c.substitutions.length > 0 && (
        <View style={[styles.noticeBox, { borderColor: palette.sageDeep, backgroundColor: palette.sageMist }]}>
          <Check size={14} color={palette.sageDeep} strokeWidth={2.5} />
          <Text style={[type.bodySm, { flex: 1, marginLeft: 6, color: palette.ink }]}>
            {c.substitutions.length} swap{c.substitutions.length > 1 ? 's' : ''} made for your health
          </Text>
        </View>
      )}

      {/* CO2 + actions */}
      <View style={styles.co2Row}>
        <Leaf size={14} color={palette.sageDeep} strokeWidth={2.5} />
        <Text style={[type.bodySm, { marginLeft: 6, color: colors.text }]}>
          Saves <Text style={{ fontFamily: font.sansBold, color: palette.sageDeep }}>{co2eAvoidedForMeal(c.co2eKg)} kg</Text> CO2
        </Text>
      </View>

      <View style={styles.btnRow}>
        <BrutalButton variant="dark" onPress={onCook} style={{ flex: 1 }}>
          {selected ? <Check size={16} color={palette.chalk} strokeWidth={2.5} /> : <ChefHat size={16} color={palette.chalk} strokeWidth={2.5} />}
          <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>{selected ? 'COOKED' : 'COOK'}</Text>
        </BrutalButton>
        {missingCount > 0 && (
          <BrutalButton variant="light" onPress={onShop} style={{ flex: 1, marginLeft: 8 }}>
            <ShoppingCart size={16} color={palette.ink} strokeWidth={2.5} />
            <Text style={[type.label, { color: palette.ink, marginLeft: 8 }]}>SHOP</Text>
          </BrutalButton>
        )}
      </View>
    </View>
  );
}

function RecipeDetail({ c, onClose, onCook, colors }: { c: RecipeCandidate | null; onClose: () => void; onCook: (c: RecipeCandidate) => void; colors: any }) {
  if (!c) return null;
  const pairings = c.ingredients.length > 0 ? getPairings(c.ingredients[0].name) : [];
  return (
    <Modal visible={!!c} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BrutalPanel style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>{c.name}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.subText} strokeWidth={2.5} /></TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
            <Label>INGREDIENTS</Label>
            {c.ingredients.map((ing) => {
              const missing = c.missing.includes(ing.name);
              const subbed = c.substitutions.find((s) => s.to === ing.name);
              return (
                <View key={ing.name} style={styles.ingRow}>
                  <View style={[styles.ingDot, { backgroundColor: missing ? palette.crimson : palette.sageDeep, borderColor: palette.ink }]} />
                  <Text style={[type.body, { flex: 1, color: missing ? palette.crimson : colors.text }]}>
                    {ing.name} · {ing.grams}g
                  </Text>
                  {missing && <Pill tone="danger">NEED</Pill>}
                  {subbed && <Pill tone="warning">SWAPPED</Pill>}
                </View>
              );
            })}

            {c.substitutions.length > 0 && (
              <View style={[styles.noticeBox, { marginTop: spacing[3], borderColor: palette.sageDeep, backgroundColor: palette.sageMist }]}>
                <Text style={[type.bodySm, { flex: 1, color: palette.ink }]}>
                  {c.substitutions.map((s) => `${s.from} → ${s.to} (${s.reason})`).join('. ')}
                </Text>
              </View>
            )}

            <Divider color={colors.border} />

            <Label>NUTRITION (full recipe)</Label>
            <View style={styles.nutriGrid}>
              <NutriBox label="Calories" value={Math.round(c.nutrition.kcal)} colors={colors} />
              <NutriBox label="Protein" value={`${Math.round(c.nutrition.proteinG)}g`} colors={colors} />
              <NutriBox label="Carbs" value={`${Math.round(c.nutrition.carbG)}g`} colors={colors} />
              <NutriBox label="Fat" value={`${Math.round(c.nutrition.fatG)}g`} colors={colors} />
              <NutriBox label="Fiber" value={`${Math.round(c.nutrition.fiberG)}g`} colors={colors} />
              <NutriBox label="Iron" value={`${Math.round(c.nutrition.iron)}mg`} colors={colors} />
            </View>

            {pairings.length > 0 && (
              <View style={{ marginTop: spacing[4] }}>
                <Label>PAIRS WELL WITH</Label>
                <View style={styles.pairingRow}>
                  {pairings.map((p) => (
                    <View key={p} style={[styles.pairingChip, { borderColor: palette.ink }]}>
                      <Text style={[type.bodySm, { color: palette.ink }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing[4] }}>
              <Label>ENVIRONMENTAL IMPACT</Label>
              <Text style={[type.h2, { color: palette.sageDeep, marginTop: 4 }]}>
                {co2eAvoidedForMeal(c.co2eKg)} kg CO2 saved
              </Text>
            </View>
          </ScrollView>

          <BrutalButton variant="dark" onPress={() => { onCook(c); onClose(); }} style={{ marginTop: spacing[4] }}>
            <ChefHat size={16} color={palette.chalk} strokeWidth={2.5} />
            <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>COOK & LOG</Text>
          </BrutalButton>
        </BrutalPanel>
      </View>
    </Modal>
  );
}

function ScoreChip({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.bodySm, { color: colors.subText, fontSize: 11 }]}>{label}</Text>
      <View style={{ marginTop: 4 }}>
        <Bar value={value} color={color} />
      </View>
    </View>
  );
}

function NutriBox({ label, value, colors }: { label: string; value: any; colors: any }) {
  return (
    <View style={{ borderWidth: border.md, borderColor: palette.ink, padding: spacing[2], minWidth: '31%', flex: 1 }}>
      <Text style={[type.h2, { fontSize: 16, color: colors.text }]}>{value}</Text>
      <Text style={[type.bodySm, { color: palette.mist }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing[4] },
  header: { marginBottom: spacing[4] },
  controls: { marginBottom: spacing[4] },
  sliderRow: { marginBottom: spacing[3] },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sliderTrack: { height: 28, flexDirection: 'row', alignItems: 'center', position: 'relative', backgroundColor: palette.paper, borderWidth: border.thick, borderColor: palette.ink, overflow: 'hidden' },
  sliderTick: { width: '20%', height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sliderDot: { width: 12, height: 12, borderWidth: border.thin, borderColor: palette.ink, backgroundColor: palette.chalk },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.3, zIndex: 1 },
  empty: { alignItems: 'center', padding: spacing[8] },
  card: { borderWidth: border.thick, padding: spacing[4], marginBottom: spacing[3] },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  favBtn: { padding: 4 },
  scoreRow: { flexDirection: 'row', gap: 8, marginTop: spacing[3] },
  noticeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: border.thin, padding: spacing[2], marginTop: spacing[2], gap: 4 },
  co2Row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3] },
  btnRow: { flexDirection: 'row', marginTop: spacing[3] },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,10,10,0.6)' },
  modalPanel: { maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  ingDot: { width: 10, height: 10, borderWidth: border.thin },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing[2] },
  pairingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing[2] },
  pairingChip: { borderWidth: border.thin, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: palette.sageMist },
});
