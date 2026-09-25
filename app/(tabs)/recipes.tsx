import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { MealPlanView } from './plan';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Animated, Easing, InteractionManager,
} from 'react-native';
import {
  Leaf, Check, AlertCircle, ChefHat, Heart,
  ShoppingCart, X, Star, Dice5, Calendar,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSuccess, hapticSelection } from '@/lib/haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { palette, type, spacing, font, border } from '@/lib/theme';
import {
  Label, Pill, Divider, BrutalButton, BrutalPanel,
  PressScale, SkeletonCard, useTheme, useToast, Loader, EmptyState
} from '@/components/ui';
import { useInventory, useProfile, useImpact, useFavorites, useShoppingList, useXp } from '@/lib/hooks';
import { optimizeRecipes, RecipeCandidate, OptimizerWeights } from '@/lib/optimizer';
import { computeRDA, RDA } from '@/lib/rda';
import { FOOD_BY_NAME } from '@/lib/foodCatalog';
import { co2eAvoidedForMeal } from '@/lib/impact';
import { xpForMeal, getPairings } from '@/lib/features';
import { generateStrictRecipe } from '@/lib/ai';
import { getVaultRecipes, saveRecipeToVault, removeRecipeFromVault } from '@/lib/vault';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeDetail } from '@/components/recipes/RecipeDetail';

export default function RecipesScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { items, loading: invLoading } = useInventory();
  const { profile } = useProfile();
  const { logEvent } = useImpact();
  const { favs, toggle: toggleFav } = useFavorites();
  const { addItems: addShopping } = useShoppingList();
  const { addXp } = useXp();
  const [weights, setWeights] = useState<OptimizerWeights>({ waste: 0.5, rda: 0.3, completeness: 0.2 });
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeCandidate | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'pantry' | 'vault'>('pantry');
  const [vaultRecipes, setVaultRecipes] = useState<RecipeCandidate[]>([]);
  const [mainTab, setMainTab] = useState<'recipes' | 'plan'>('recipes');

  useFocusEffect(
    useCallback(() => {
      getVaultRecipes().then(setVaultRecipes);
    }, [])
  );

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

  const [recipes, setRecipes] = useState<RecipeCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        const computed = optimizeRecipes(inventoryMap, rda, profile?.conditions ?? [], weights);
        setRecipes(computed);
      }
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [inventoryMap, rda, profile?.conditions, weights]);

  const cook = useCallback(async (c: RecipeCandidate) => {
    hapticSuccess();
    const avoided = co2eAvoidedForMeal(c.co2eKg);
    await logEvent('rescue_meal', avoided, { recipe: c.name });
    await addXp(xpForMeal(avoided));
    setSelected(c.name);
    toast.show(`${c.name} cooked! Logged +XP`, 'success');
    setTimeout(() => setSelected(null), 3000);
  }, [logEvent, addXp, toast]);

  const addToShopping = useCallback(async (c: RecipeCandidate) => {
    if (c.missing.length === 0) {
      toast.show('All ingredients already in pantry!', 'info');
      return;
    }
    const missing = c.missing.map((name) => {
      const food = FOOD_BY_NAME[name.toLowerCase()];
      return { item_name: name, category: food?.category ?? 'other', quantity: 1 };
    });
    await addShopping(missing);
    hapticSuccess();
    toast.show(`${c.missing.length} item${c.missing.length > 1 ? 's' : ''} added to shopping list`, 'success');
  }, [addShopping, toast]);

  const handleFav = useCallback((name: string) => {
    toggleFav(name);
    hapticSelection();
  }, [toggleFav]);

  const handleDetail = useCallback((c: RecipeCandidate) => {
    hapticSelection();
    setDetail(c);
  }, []);

  const handleStrictAI = async () => {
    if (items.length === 0) return;
    setAiLoading(true);
    try {
      const generated = await generateStrictRecipe(items.map(i => ({ name: i.name, quantity: Number(i.quantity), unit: i.unit })));
      const candidate: RecipeCandidate = {
        name: generated.name,
        ingredients: generated.ingredients,
        missing: [],
        substitutions: [],
        co2eKg: 0,
        nutrition: {
          ...generated.nutrition,
          vitC: 0, vitA: 0, calcium: 0, potassium: 0,
        },
        wasteScore: 1,
        rdaScore: 1,
        completeness: 1,
        rank: 1,
      };
      setDetail(candidate);
      toast.show('AI recipe ready!', 'success');
    } catch (e: any) {
      console.error("AI Strict Recipe Error:", e);
      toast.show(e.message || 'AI unavailable, try again', 'error');
    }
    setAiLoading(false);
  };

  const handleRoulette = async () => {
    if (items.length === 0) return;
    setRouletteLoading(true);
    try {
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      const generated = await generateStrictRecipe(selected.map(i => ({ name: i.name, quantity: Number(i.quantity), unit: i.unit })));
      const candidate: RecipeCandidate = {
        name: generated.name,
        ingredients: generated.ingredients,
        missing: [], substitutions: [], co2eKg: 0,
        nutrition: generated.nutrition, wasteScore: 1, rdaScore: 1, completeness: 1, rank: 1,
        instructions: generated.instructions, // pass instructions to detail view
      } as any;
      setDetail(candidate);
      toast.show('Roulette recipe ready!', 'success');
    } catch (e: any) {
      console.error("AI Roulette Error:", e);
      toast.show(e.message || 'AI unavailable, try again', 'error');
    }
    setRouletteLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      {/* Top Segmented Switcher: Recipes vs Meal Plan */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.segmentBtn,
            mainTab === 'recipes' && { backgroundColor: palette.forestDeep }
          ]}
          onPress={() => { hapticSelection(); setMainTab('recipes'); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ChefHat size={16} color={mainTab === 'recipes' ? palette.chalk : colors.subText} strokeWidth={2.5} />
            <Text style={[styles.segmentText, { color: mainTab === 'recipes' ? palette.chalk : colors.text, fontFamily: font.sansBold }]}>
              Rescue Recipes
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.segmentBtn,
            mainTab === 'plan' && { backgroundColor: palette.forestDeep }
          ]}
          onPress={() => { hapticSelection(); setMainTab('plan'); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color={mainTab === 'plan' ? palette.chalk : colors.subText} strokeWidth={2.5} />
            <Text style={[styles.segmentText, { color: mainTab === 'plan' ? palette.chalk : colors.text, fontFamily: font.sansBold }]}>
              Meal Plan
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {mainTab === 'plan' ? (
        <MealPlanView embedded={true} />
      ) : (
        <ScrollView
          style={[styles.container, { backgroundColor: colors.bg }]}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Recipes</Text>
            <Text style={[styles.screenSub, { color: colors.subText }]}>
              {viewMode === 'pantry' ? `${recipes.length} meals from your pantry` : `${vaultRecipes.length} saved recipes`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <BrutalButton variant={viewMode === 'pantry' ? 'sage' : 'dark'} onPress={() => setViewMode('pantry')} style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
              PANTRY
            </BrutalButton>
            <BrutalButton variant={viewMode === 'vault' ? 'sage' : 'dark'} onPress={() => setViewMode('vault')} style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
              VAULT
            </BrutalButton>
          </View>
        </View>
      </View>

      {/* What matters most — compact pill selector (only in pantry mode) */}
      {viewMode === 'pantry' && (
      <View style={[styles.priorityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.controls}>
          <SliderCtrl label="Prioritise Expiry" val={weights.waste} setVal={(v: number) => setWeights(w => ({ ...w, waste: v }))} color={palette.danger} colors={colors} />
          <SliderCtrl label="Prioritise Nutrition" val={weights.rda} setVal={(v: number) => setWeights(w => ({ ...w, rda: v }))} color={palette.sageDeep} colors={colors} />
        </View>

        {/* AI buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing[3] }}>
          <PressScale onPress={handleStrictAI} disabled={aiLoading || items.length === 0} style={{ flex: 1 }}>
            <View style={[
              styles.aiBtn,
              {
                backgroundColor: aiLoading || items.length === 0 ? colors.border : palette.ink,
                opacity: items.length === 0 ? 0.5 : 1,
              },
            ]}>
              {aiLoading ? <Loader /> : <ChefHat size={15} color={palette.chalk} strokeWidth={2.2} />}
              <Text style={[styles.aiBtnText, { color: palette.chalk, fontSize: 12 }]}>
                {aiLoading ? 'Synthesizing...' : 'Pantry AI'}
              </Text>
            </View>
          </PressScale>
          
          <PressScale onPress={handleRoulette} disabled={rouletteLoading || items.length === 0} style={{ flex: 1 }}>
            <View style={[
              styles.aiBtn,
              {
                backgroundColor: rouletteLoading || items.length === 0 ? colors.border : palette.sageDeep,
                opacity: items.length === 0 ? 0.5 : 1,
              },
            ]}>
              {rouletteLoading ? <Loader /> : <Dice5 size={15} color={palette.chalk} strokeWidth={2.5} />}
              <Text style={[styles.aiBtnText, { color: palette.chalk, fontSize: 12 }]}>
                {rouletteLoading ? 'Spinning...' : 'Roulette'}
              </Text>
            </View>
          </PressScale>
        </View>
      </View>
      )}

      {/* Loading skeleton */}
      {viewMode === 'pantry' && invLoading && (
        <View style={{ gap: spacing[3], marginTop: 12 }}>
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </View>
      )}

      {/* Empty pantry state */}
      {viewMode === 'pantry' && !invLoading && items.length === 0 && (
        <EmptyState 
          icon={ChefHat} 
          title="Add Food to Your Pantry" 
          message="Once you add or scan ingredients, delicious personalized recipes appear here automatically."
          actionLabel="Scan Groceries"
          onAction={() => router.push('/scan')}
        />
      )}

      {/* Empty vault state */}
      {viewMode === 'vault' && vaultRecipes.length === 0 && (
        <EmptyState 
          icon={Star} 
          title="Recipe Vault is Empty" 
          message="Save your favorite generated and rescue recipes here so you can cook them anytime."
          actionLabel="Discover Recipes"
          onAction={() => setViewMode('pantry')}
        />
      )}

      {/* Recipe cards */}
      {(viewMode === 'pantry' ? recipes : vaultRecipes).map((c, i) => (
        <RecipeCard
          key={c.name}
          c={c}
          index={i}
          selected={selected === c.name}
          isFav={favs.includes(c.name)}
          onCook={() => cook(c)}
          onFav={() => handleFav(c.name)}
          onShop={() => addToShopping(c)}
          onDetail={() => handleDetail(c)}
          colors={colors}
          mode={mode}
        />
      ))}

      <RecipeDetail c={detail} onClose={() => setDetail(null)} onCook={cook} onShop={addToShopping} colors={colors} />
    </ScrollView>
    )}
    </View>
  );
}

// ─── Slider Control ─────────────────────────────────────────────────
function SliderCtrl({ label, val, setVal, color, colors }: any) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHead}>
        <Text style={[type.label, { color: colors.subText }]}>{label}</Text>
        <Text style={[type.label, { color: color }]}>{Math.round(val * 100)}%</Text>
      </View>
      <View style={[styles.sliderTrack, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.sliderFill, { width: `${val * 100}%`, backgroundColor: color }]} />
        {[0, 0.25, 0.5, 0.75, 1].map((step) => (
          <TouchableOpacity key={step} style={styles.sliderTick} onPress={() => setVal(step)}>
            <View style={[styles.sliderDot, { borderColor: colors.border }]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 51, 45, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 13,
  },

  container:        { flex: 1 },
  header:           { paddingHorizontal: spacing[4], marginBottom: spacing[3] },
  screenTitle:      { fontSize: 28, fontFamily: font.sansBold, letterSpacing: -0.5 },
  screenSub:        { fontSize: 13, fontFamily: font.sans, marginTop: 2 },

  // Slider
  controls:         { marginBottom: spacing[4] },
  sliderRow:        { marginBottom: spacing[3] },
  sliderHead:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sliderTrack:      { height: 28, flexDirection: 'row', alignItems: 'center', position: 'relative', backgroundColor: palette.paper, borderWidth: 1, borderColor: 'rgba(2, 51, 45, 0.12)', borderRadius: 14, overflow: 'hidden' },
  sliderTick:       { width: '20%', height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sliderDot:        { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: palette.goldenDays, backgroundColor: palette.chalk },
  sliderFill:       { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.3, zIndex: 1 },

  // Priority card
  priorityCard:     { marginHorizontal: spacing[4], borderWidth: 1, borderColor: 'rgba(2, 51, 45, 0.08)', borderRadius: 16, padding: spacing[4], marginBottom: spacing[4] },
  priorityTitle:    { fontSize: 13, fontFamily: font.sansBold, marginBottom: spacing[2], letterSpacing: 0.3 },
  priorityRow:      { flexDirection: 'row', gap: 8 },
  priorityPill:     { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 20 },
  priorityPillText: { fontSize: 12, fontFamily: font.sansBold },
  aiBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  aiBtnText:        { fontSize: 12, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 0.3 },

  // Empty
  emptyBox:         { marginHorizontal: spacing[4], alignItems: 'center', padding: spacing[8], borderWidth: 1, borderColor: 'rgba(2, 51, 45, 0.08)', borderRadius: 20 },

  // Cards
  card:             { marginHorizontal: spacing[4], borderWidth: 1, borderColor: 'rgba(2, 51, 45, 0.08)', borderRadius: 18, padding: spacing[4], marginBottom: spacing[3], overflow: 'visible' },
  bestPickBadge:    { position: 'absolute', top: -10, left: 16, backgroundColor: palette.sageDeep, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bestPickText:     { fontSize: 9, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 1 },
  cardHead:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[3] },
  cardTitle:        { fontSize: 18, fontFamily: font.sansBold, lineHeight: 24 },
  cardSub:          { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  favArea:          { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  // Score bars
  scoreGrid:        { flexDirection: 'row', gap: 10, marginBottom: spacing[3] },
  scoreLabel:       { fontSize: 10, fontFamily: font.sansBold, marginBottom: 4, letterSpacing: 0.3 },
  scoreTrack:       { height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill:        { height: 6, borderRadius: 3 },

  // Notices
  noticeBox:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: spacing[3], paddingVertical: 8, marginBottom: spacing[2] },
  noticeText:       { flex: 1, fontSize: 12, fontFamily: font.sans },

  // CO2
  co2Row:           { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing[3] },
  co2Text:          { fontSize: 13, fontFamily: font.sans },

  // Buttons
  btnRow:           { flexDirection: 'row' },
  actionBtnWrap:    {},
  actionBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 44 },
  actionBtnText:    { fontSize: 11, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 0.5 },

  // Modal
  modalOverlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing[5], paddingBottom: 40, paddingTop: 12, maxHeight: '92%' },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.mist2, alignSelf: 'center', marginBottom: spacing[4] },
  modalHeader:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[4] },
  closeBtn:         { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalBtnRow:      { flexDirection: 'row', marginTop: spacing[4] },

  // Ingredients
  ingRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  ingDot:           { width: 8, height: 8, borderRadius: 4 },
  ingName:          { flex: 1, fontSize: 15, fontFamily: font.sansBold },
  ingGrams:         { fontSize: 13, fontFamily: font.sans },

  // Steps
  stepRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: spacing[3] },
  stepNum:          { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText:      { fontSize: 11, fontFamily: font.sansBold, color: palette.chalk },
  stepText:         { flex: 1, fontSize: 14, fontFamily: font.sans, lineHeight: 22 },

  // Nutrition
  nutriGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing[2] },
  nutriBox:         { borderWidth: 1.5, borderRadius: 12, padding: spacing[3], minWidth: '30%', flex: 1 },
  nutriVal:         { fontSize: 18, fontFamily: font.sansBold },
  nutriLabel:       { fontSize: 11, fontFamily: font.sans, marginTop: 2 },

  // Pairings
  pairingRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing[2] },
  pairingChip:      { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
