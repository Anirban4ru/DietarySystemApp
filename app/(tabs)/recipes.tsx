import { MealPlanView } from './plan';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Animated, Easing,
} from 'react-native';
import {
  Leaf, Check, AlertCircle, ChefHat, Heart,
  ShoppingCart, X, Sparkles, Star, Dice5, Calendar,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
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

export default function RecipesScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { items } = useInventory();
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

  const recipes = useMemo(
    () => optimizeRecipes(inventoryMap, rda, profile?.conditions ?? [], weights),
    [inventoryMap, rda, profile, weights],
  );

  const cook = async (c: RecipeCandidate) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const avoided = co2eAvoidedForMeal(c.co2eKg);
    await logEvent('rescue_meal', avoided, { recipe: c.name });
    await addXp(xpForMeal(avoided));
    setSelected(c.name);
    toast.show(`${c.name} cooked! Logged +XP`, 'success');
    setTimeout(() => setSelected(null), 3000);
  };

  const addToShopping = async (c: RecipeCandidate) => {
    if (c.missing.length === 0) {
      toast.show('All ingredients already in pantry!', 'info');
      return;
    }
    const missing = c.missing.map((name) => {
      const food = FOOD_BY_NAME[name.toLowerCase()];
      return { item_name: name, category: food?.category ?? 'other', quantity: 1 };
    });
    await addShopping(missing);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show(`${c.missing.length} item${c.missing.length > 1 ? 's' : ''} added to shopping list`, 'success');
  };

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
          onPress={() => { Haptics.selectionAsync(); setMainTab('recipes'); }}
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
          onPress={() => { Haptics.selectionAsync(); setMainTab('plan'); }}
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
              {aiLoading ? <Loader /> : <Sparkles size={15} color={palette.chalk} strokeWidth={2.5} />}
              <Text style={[styles.aiBtnText, { color: palette.chalk, fontSize: 12 }]}>
                {aiLoading ? 'Gen...' : 'Strict AI'}
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

      {/* Empty pantry state */}
      {viewMode === 'pantry' && items.length === 0 && (
        <EmptyState 
          icon={ChefHat} 
          title="Add food to your pantry first" 
          message="Once you have items, recipes appear here automatically."
        />
      )}

      {/* Empty vault state */}
      {viewMode === 'vault' && vaultRecipes.length === 0 && (
        <EmptyState 
          icon={Star} 
          title="Vault is empty" 
          message="Save your favorite AI recipes here so you can cook them anytime."
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
          onFav={() => { toggleFav(c.name); Haptics.selectionAsync(); }}
          onShop={() => addToShopping(c)}
          onDetail={() => { Haptics.selectionAsync(); setDetail(c); }}
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

// ─── Recipe Card ──────────────────────────────────────────────────
function RecipeCard({ c, index, selected, isFav, onCook, onFav, onShop, onDetail, colors, mode }: {
  c: RecipeCandidate; index: number; selected: boolean; isFav: boolean; mode: string;
  onCook: () => void; onFav: () => void; onShop: () => void; onDetail: () => void; colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const missingCount = c.missing.length;
  const isBestPick = index === 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: isBestPick ? palette.sageDeep : colors.border }]}>

        {/* Best pick crown */}
        {isBestPick && (
          <View style={styles.bestPickBadge}>
            <Star size={10} color={palette.chalk} fill={palette.chalk} strokeWidth={0} />
            <Text style={styles.bestPickText}>BEST PICK</Text>
          </View>
        )}

        {/* Card header */}
        <View style={styles.cardHead}>
          <PressScale onPress={onDetail} style={{ flex: 1 }}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{c.name}</Text>
              <Text style={[styles.cardSub, { color: colors.subText }]}>
                {c.ingredients.length} ingredients · {Math.round(c.nutrition.kcal)} kcal · {Math.round(c.nutrition.proteinG)}g P · {Math.round(c.nutrition.carbG)}g C
              </Text>
            </View>
          </PressScale>
          <PressScale onPress={onFav}>
            <View style={styles.favArea}>
              <Heart
                size={20}
                color={isFav ? palette.crimson : colors.subText}
                fill={isFav ? palette.crimson : 'none'}
                strokeWidth={2}
              />
            </View>
          </PressScale>
        </View>

        {/* Score bars */}
        <View style={styles.scoreGrid}>
          <ScoreBar label="Waste rescue" value={c.wasteScore} color={palette.danger} colors={colors} />
          <ScoreBar label="Nutrition fit" value={c.rdaScore} color={palette.sageDeep} colors={colors} />
          <ScoreBar label="In stock" value={c.completeness} color={palette.amberDeep} colors={colors} />
        </View>

        {/* Missing notice */}
        {missingCount > 0 && (
          <View style={[styles.noticeBox, { backgroundColor: '#FFF8EC', borderColor: palette.amberDeep }]}>
            <AlertCircle size={13} color={palette.amberDeep} strokeWidth={2.5} />
            <Text style={[styles.noticeText, { color: palette.ink }]}>
              {missingCount} missing — tap SHOP to add to list
            </Text>
          </View>
        )}

        {/* CO2 line */}
        <View style={styles.co2Row}>
          <Leaf size={13} color={palette.sageDeep} strokeWidth={2.5} />
          <Text style={[styles.co2Text, { color: colors.subText }]}>
            Saves <Text style={{ color: palette.sageDeep, fontFamily: font.sansBold }}>{co2eAvoidedForMeal(c.co2eKg)} kg</Text> CO2
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <PressScale
            onPress={onCook}
            style={[styles.actionBtnWrap, { flex: 1 }] as any}
          >
            <View style={[
              styles.actionBtn,
              { backgroundColor: selected ? palette.sageDeep : palette.ink }
            ]}>
              {selected
                ? <Check size={15} color={palette.chalk} strokeWidth={2.8} />
                : <ChefHat size={15} color={palette.chalk} strokeWidth={2.5} />}
              <Text style={styles.actionBtnText}>
                {selected ? 'COOKED' : 'COOK'}
              </Text>
            </View>
          </PressScale>

          <PressScale
            onPress={onShop}
            style={[styles.actionBtnWrap, { flex: 1, marginLeft: 8 }] as any}
          >
            <View style={[
              styles.actionBtn,
              {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: missingCount > 0 ? palette.sageDeep : colors.border,
              },
            ]}>
              <ShoppingCart size={15} color={missingCount > 0 ? palette.sageDeep : colors.subText} strokeWidth={2.5} />
              <Text style={[styles.actionBtnText, { color: missingCount > 0 ? palette.sageDeep : colors.subText }]}>
                SHOP {missingCount > 0 ? `(${missingCount})` : ''}
              </Text>
            </View>
          </PressScale>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────
function ScoreBar({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthPct = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.scoreLabel, { color: colors.subText }]}>{label}</Text>
      <View style={[styles.scoreTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.scoreFill, { width: widthPct, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Recipe Detail Modal ──────────────────────────────────────────
function RecipeDetail({ c, onClose, onCook, onShop, colors }: {
  c: RecipeCandidate | null; onClose: () => void;
  onCook: (c: RecipeCandidate) => void;
  onShop: (c: RecipeCandidate) => void;
  colors: any;
}) {
  const toast = useToast();
  if (!c) return null;
  const pairings = c.ingredients.length > 0 ? getPairings(c.ingredients[0].name) : [];

  return (
    <Modal visible={!!c} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text, flex: 1, marginRight: 12 }]} numberOfLines={2}>{c.name}</Text>
            <PressScale onPress={onClose}>
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>

          <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {/* Ingredients */}
            <Label>INGREDIENTS</Label>
            <View style={{ marginTop: spacing[2] }}>
              {c.ingredients.map((ing) => {
                const missing = c.missing.includes(ing.name);
                const subbed = c.substitutions.find((s) => s.to === ing.name);
                return (
                  <View key={ing.name} style={[styles.ingRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.ingDot, { backgroundColor: missing ? palette.danger : palette.sageDeep }]} />
                    <Text style={[styles.ingName, { color: missing ? palette.danger : colors.text }]}>
                      {ing.name}
                    </Text>
                    <Text style={[styles.ingGrams, { color: colors.subText }]}>{ing.grams}g</Text>
                    {missing && <Pill tone="danger">NEED</Pill>}
                    {subbed && <Pill tone="warning">SWAPPED</Pill>}
                  </View>
                );
              })}
            </View>

            {/* Instructions (if AI-generated) */}
            {(c as any).instructions && (c as any).instructions.length > 0 && (
              <View style={{ marginTop: spacing[4] }}>
                <Label>HOW TO COOK</Label>
                {(c as any).instructions.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: palette.ink }]}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            <Divider color={colors.border} />

            {/* Nutrition */}
            <Label>NUTRITION</Label>
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
                    <View key={p} style={[styles.pairingChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Text style={[type.bodySm, { color: colors.text }]}>{p}</Text>
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

            <View style={{ marginTop: spacing[6], gap: 8 }}>
              <BrutalButton variant="sage" onPress={async () => {
                await saveRecipeToVault(c);
                toast.show('Saved to Offline Vault 💾', 'success');
              }}>
                <Text style={[type.label, { color: palette.chalk }]}>SAVE TO VAULT</Text>
              </BrutalButton>
              <BrutalButton variant="outline" onPress={async () => {
                await removeRecipeFromVault(c.name);
                toast.show('Removed from Vault', 'info');
              }}>
                <Text style={[type.label, { color: colors.text }]}>REMOVE FROM VAULT</Text>
              </BrutalButton>
            </View>

            <View style={{ height: spacing[4] }} />
          </ScrollView>

          {/* Modal action buttons */}
          <View style={styles.modalBtnRow}>
            <PressScale onPress={() => { onCook(c); onClose(); }} style={{ flex: 1 }}>
              <View style={[styles.actionBtn, { backgroundColor: palette.ink }]}>
                <ChefHat size={15} color={palette.chalk} strokeWidth={2.5} />
                <Text style={styles.actionBtnText}>COOK & LOG</Text>
              </View>
            </PressScale>
            {c.missing.length > 0 && (
              <PressScale onPress={() => { onShop(c); onClose(); }} style={{ flex: 1, marginLeft: 8 }}>
                <View style={[styles.actionBtn, { backgroundColor: palette.sageDeep }]}>
                  <ShoppingCart size={15} color={palette.chalk} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText}>SHOP MISSING</Text>
                </View>
              </PressScale>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NutriBox({ label, value, colors }: { label: string; value: any; colors: any }) {
  return (
    <View style={[styles.nutriBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.nutriVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.nutriLabel, { color: colors.subText }]}>{label}</Text>
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
    borderWidth: 1.5,
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
  sliderTrack:      { height: 28, flexDirection: 'row', alignItems: 'center', position: 'relative', backgroundColor: palette.paper, borderWidth: border.thick, borderColor: palette.ink, overflow: 'hidden' },
  sliderTick:       { width: '20%', height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sliderDot:        { width: 12, height: 12, borderWidth: border.thin, borderColor: palette.ink, backgroundColor: palette.chalk },
  sliderFill:       { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.3, zIndex: 1 },

  // Priority card
  priorityCard:     { marginHorizontal: spacing[4], borderWidth: 1.5, borderRadius: 16, padding: spacing[4], marginBottom: spacing[4] },
  priorityTitle:    { fontSize: 13, fontFamily: font.sansBold, marginBottom: spacing[2], letterSpacing: 0.3 },
  priorityRow:      { flexDirection: 'row', gap: 8 },
  priorityPill:     { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 20 },
  priorityPillText: { fontSize: 12, fontFamily: font.sansBold },
  aiBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  aiBtnText:        { fontSize: 12, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 0.3 },

  // Empty
  emptyBox:         { marginHorizontal: spacing[4], alignItems: 'center', padding: spacing[8], borderWidth: 1.5, borderRadius: 20 },

  // Cards
  card:             { marginHorizontal: spacing[4], borderWidth: 1.5, borderRadius: 18, padding: spacing[4], marginBottom: spacing[3], overflow: 'visible' },
  bestPickBadge:    { position: 'absolute', top: -10, left: 16, backgroundColor: palette.sageDeep, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bestPickText:     { fontSize: 9, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 1 },
  cardHead:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[3] },
  cardTitle:        { fontSize: 18, fontFamily: font.sansBold, lineHeight: 24 },
  cardSub:          { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  favArea:          { padding: 6 },

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
  actionBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  actionBtnText:    { fontSize: 11, fontFamily: font.sansBold, color: palette.chalk, letterSpacing: 0.5 },

  // Modal
  modalOverlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing[5], paddingBottom: 40, paddingTop: 12, maxHeight: '92%' },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.mist2, alignSelf: 'center', marginBottom: spacing[4] },
  modalHeader:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[4] },
  closeBtn:         { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
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
