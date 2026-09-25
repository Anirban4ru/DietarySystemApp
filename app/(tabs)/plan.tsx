import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import {
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Heart,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  X,
  Search,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSuccess, hapticSelection, hapticWarning } from '@/lib/haptics';
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
  SkeletonCard,
  EmptyState,
} from '@/components/ui';
import { PressableScale, FadeInStagger } from '@/components/motion';
import { useMealPlan, useFavorites, useInventory, useShoppingList } from '@/lib/hooks';
import { searchMealByName, searchMealSuggestions } from '@/lib/ai';
import { FOOD_BY_NAME } from '@/lib/foodCatalog';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const CURATED_SUGGESTIONS = [
  'Rescue Stir-Fry',
  'Green Power Bowl',
  'Hearty Lentil Stew',
  'Protein Scramble',
  'Roasted Root Plate',
  'Mediterranean Salad',
  'Chicken & Herb Quinoa',
  'Overnight Chia Oats',
  'Crispy Chickpea Wrap',
  'Tuscan White Bean Soup',
];

function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1; // convert to Mon=0
}

export function MealPlanView({ embedded = false }: { embedded?: boolean }) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { plan, loading, add, remove } = useMealPlan();
  const { favs, toggle: toggleFav } = useFavorites();
  const { items: pantryItems } = useInventory();
  const { addItems: addShopping } = useShoppingList();

  const [activeDay, setActiveDay] = useState(todayDayIndex());
  const [addModal, setAddModal] = useState<{ day: number; meal: MealType } | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [aiRecipes, setAiRecipes] = useState<Record<string, any>>({});
  const [loadingRecipe, setLoadingRecipe] = useState<string | null>(null);

  // Expiring items from pantry (shelf life <= 2 days or freshness <= 30)
  const expiringPantryNames = useMemo(() => {
    return pantryItems
      .filter((item) => {
        if (!item.expires_at) return (item.freshness_score ?? 100) <= 35;
        const diffDays = Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000);
        return diffDays <= 2;
      })
      .map((item) => item.name.toLowerCase());
  }, [pantryItems]);

  const fetchAiRecipe = async (id: string, name: string) => {
    if (aiRecipes[id]) return;
    setLoadingRecipe(id);
    try {
      const res = await searchMealByName(name);
      setAiRecipes((prev) => ({ ...prev, [id]: res }));
    } catch (e) {
      console.warn('AI Recipe failed to load', e);
      toast.show('Could not retrieve full recipe details.', 'info');
    } finally {
      setLoadingRecipe(null);
    }
  };

  const dayPlan = useMemo(() => {
    return plan.filter((e) => e.day_of_week === activeDay);
  }, [plan, activeDay]);

  const totalMeals = plan.length;

  const toggleExpand = (entryId: string, recipeName: string) => {
    hapticSelection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isNowExpanded = expandedEntry !== entryId;
    setExpandedEntry(isNowExpanded ? entryId : null);
    if (isNowExpanded && !aiRecipes[entryId]) {
      fetchAiRecipe(entryId, recipeName);
    }
  };

  // Check if a recipe uses expiring pantry ingredients
  const checkExpiringMatch = (recipeName: string, recipeDetails?: any) => {
    const textToSearch = (
      recipeName +
      ' ' +
      (recipeDetails?.ingredients?.map((i: any) => i.name).join(' ') || '')
    ).toLowerCase();
    return expiringPantryNames.some((exp) => textToSearch.includes(exp));
  };

  // Calculate pantry coverage percentage
  const calculatePantryCoverage = (recipeDetails?: any) => {
    if (!recipeDetails?.ingredients || recipeDetails.ingredients.length === 0) {
      return { pct: 75, coveredCount: 3, totalCount: 4 }; // Sensible heuristic when not loaded
    }
    const ings = recipeDetails.ingredients;
    let covered = 0;
    ings.forEach((ing: any) => {
      const ingName = (ing.name || '').toLowerCase();
      const inPantry = pantryItems.some((p) => ingName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(ingName));
      if (inPantry) covered++;
    });
    const pct = Math.round((covered / ings.length) * 100);
    return { pct, coveredCount: covered, totalCount: ings.length };
  };

  const handleAddMissingToShopping = async (recipeName: string, recipeDetails: any) => {
    if (!recipeDetails?.ingredients || recipeDetails.ingredients.length === 0) {
      toast.show('Expand recipe details first to detect missing items.', 'info');
      return;
    }
    const missing = recipeDetails.ingredients.filter((ing: any) => {
      const ingName = (ing.name || '').toLowerCase();
      return !pantryItems.some((p) => ingName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(ingName));
    });

    if (missing.length === 0) {
      toast.show('All ingredients already in your pantry!', 'success');
      return;
    }

    const toAdd = missing.map((m: any) => {
      const food = FOOD_BY_NAME[(m.name || '').toLowerCase()];
      return {
        item_name: m.name,
        category: food?.category ?? 'other',
        quantity: 1,
      };
    });

    await addShopping(toAdd);
    hapticSuccess();
    toast.show(`Added ${toAdd.length} missing items to grocery list`, 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: embedded ? 8 : insets.top + 8,
          paddingHorizontal: spacing[4],
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!embedded && (
          <AppHeader
            title="Weekly Plan"
            subtitle={`${totalMeals} meals scheduled this week`}
            rightAction={
              <IconButton
                icon={<Plus size={20} color={palette.chalk} strokeWidth={2.5} />}
                onPress={() => {
                  hapticSelection();
                  setAddModal({ day: activeDay, meal: 'Lunch' });
                }}
                accessibilityLabel="Add meal"
                size={40}
                style={{ backgroundColor: palette.forestDeep }}
              />
            }
          />
        )}

        {/* ── Week Overview Strip ── */}
        <SurfaceCard style={styles.weekStripCard}>
          <View style={styles.stripHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color={palette.forestDeep} strokeWidth={2.5} />
              <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.8 }]}>WEEK OVERVIEW</Text>
            </View>
            <Text style={[type.monoBold, { color: palette.forestDeep, fontSize: 12 }]}>
              {dayPlan.length} {dayPlan.length === 1 ? 'meal' : 'meals'} {DAYS[activeDay]}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripContainer}>
            {DAYS.map((day, idx) => {
              const isActive = idx === activeDay;
              const isToday = idx === todayDayIndex();
              const dayMeals = plan.filter((e) => e.day_of_week === idx);
              const count = dayMeals.length;

              return (
                <PressableScale
                  key={day}
                  onPress={() => {
                    hapticSelection();
                    setActiveDay(idx);
                  }}
                  accessibilityLabel={`${day}, ${count} meals scheduled`}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isActive
                        ? palette.forestDeep
                        : mode === 'dark'
                        ? colors.surface
                        : colors.bg,
                      borderColor: isActive
                        ? palette.forestDeep
                        : isToday
                        ? palette.forestDeep
                        : colors.border,
                      borderWidth: isToday && !isActive ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isActive
                          ? palette.chalk
                          : isToday
                          ? palette.forestDeep
                          : colors.subText,
                        fontFamily: isToday || isActive ? font.sansBold : font.sans,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                  <Text
                    style={[
                      styles.dayCountText,
                      { color: isActive ? 'rgba(255,255,255,0.8)' : colors.text },
                    ]}
                  >
                    {count}
                  </Text>
                  <View style={styles.dotRow}>
                    {dayMeals.slice(0, 3).map((_, dotIdx) => (
                      <View
                        key={dotIdx}
                        style={[
                          styles.mealDot,
                          {
                            backgroundColor: isActive
                              ? palette.saffron
                              : isToday
                              ? palette.forestDeep
                              : palette.sage,
                          },
                        ]}
                      />
                    ))}
                    {dayMeals.length === 0 && (
                      <View style={[styles.mealDot, { backgroundColor: 'transparent' }]} />
                    )}
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </SurfaceCard>

        {/* ── Active Day Title & Action ── */}
        <View style={styles.dayTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.dayHeading, { color: colors.text }]}>{DAYS[activeDay]}</Text>
            {activeDay === todayDayIndex() && (
              <StatusBadge label="TODAY" variant="success" size="sm" />
            )}
          </View>
          <PrimaryAction
            label="Schedule Meal"
            onPress={() => {
              hapticSelection();
              setAddModal({ day: activeDay, meal: 'Lunch' });
            }}
            icon={<Plus size={16} color={palette.chalk} strokeWidth={2.5} />}
            size="sm"
            style={{ minHeight: 38 }}
          />
        </View>

        {/* ── Loading Skeleton ── */}
        {loading && (
          <View style={{ gap: spacing[3], marginTop: 8 }}>
            <SkeletonCard height={96} />
            <SkeletonCard height={96} />
          </View>
        )}

        {/* ── Meals List ── */}
        {!loading && dayPlan.length === 0 ? (
          <EmptyState
            title={`No meals planned for ${DAYS[activeDay]}`}
            description="Organize your meals ahead of time to optimize grocery spending and prevent ingredient spoilage."
            actionLabel={`Add ${DAYS[activeDay]} Meal`}
            onAction={() => {
              hapticSelection();
              setAddModal({ day: activeDay, meal: 'Lunch' });
            }}
            icon={<UtensilsCrossed size={32} color={palette.forestDeep} strokeWidth={2} />}
          />
        ) : !loading ? (
          <View style={{ gap: spacing[3] }}>
            {dayPlan.map((entry, index) => {
              const isExpanded = expandedEntry === entry.id;
              const recipeDetail = aiRecipes[entry.id];
              const usesExpiring = checkExpiringMatch(entry.recipe_name, recipeDetail);
              const coverage = calculatePantryCoverage(recipeDetail);
              const isFavorited = favs.includes(entry.recipe_name);

              return (
                <SurfaceCard key={entry.id} style={styles.mealCard}>
                  {/* Top Bar / Header */}
                  <PressableScale
                    onPress={() => toggleExpand(entry.id, entry.recipe_name)}
                    accessibilityLabel={`Meal ${entry.recipe_name}, ${entry.meal_type}`}
                    style={styles.cardHeaderPressable}
                  >
                    <View style={styles.mealMetaRow}>
                      <View style={styles.mealTypeBadge}>
                        <Text style={[styles.mealTypeText, { color: palette.forestDeep }]}>
                          {entry.meal_type}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {usesExpiring && (
                          <StatusBadge
                            label="Rescues Pantry Food"
                            variant="warning"
                            size="sm"
                            icon={<AlertTriangle size={11} color={palette.saffron} strokeWidth={2.5} />}
                          />
                        )}
                        <StatusBadge
                          label={`${coverage.pct}% in pantry`}
                          variant={coverage.pct >= 70 ? 'success' : 'neutral'}
                          size="sm"
                          icon={<CheckCircle2 size={11} color={coverage.pct >= 70 ? palette.forestDeep : colors.subText} strokeWidth={2.5} />}
                        />
                      </View>
                    </View>

                    <View style={styles.mealTitleRow}>
                      <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
                        {entry.recipe_name}
                      </Text>
                      <View style={styles.cardActionIcons}>
                        <PressableScale
                          onPress={() => {
                            hapticSelection();
                            toggleFav(entry.recipe_name);
                            toast.show(
                              isFavorited
                                ? `Removed from saved recipes`
                                : `Saved "${entry.recipe_name}" to favorites`,
                              'success'
                            );
                          }}
                          hitSlop={8}
                          style={styles.miniIconBtn}
                          accessibilityLabel={isFavorited ? 'Remove favorite' : 'Add to favorites'}
                        >
                          <Heart
                            size={18}
                            color={isFavorited ? palette.burgundy : colors.subText}
                            fill={isFavorited ? palette.burgundy : 'transparent'}
                            strokeWidth={2}
                          />
                        </PressableScale>

                        <PressableScale
                          onPress={() => {
                            hapticWarning();
                            remove(entry.id);
                            toast.show('Meal removed from plan', 'info');
                          }}
                          hitSlop={8}
                          style={styles.miniIconBtn}
                          accessibilityLabel="Delete meal"
                        >
                          <Trash2 size={18} color={palette.burgundy} strokeWidth={2} />
                        </PressableScale>

                        <View style={{ marginLeft: 4 }}>
                          {isExpanded ? (
                            <ChevronUp size={20} color={colors.subText} strokeWidth={2.2} />
                          ) : (
                            <ChevronDown size={20} color={colors.subText} strokeWidth={2.2} />
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Quick Specs */}
                    <View style={styles.quickSpecsRow}>
                      <View style={styles.specItem}>
                        <Clock size={13} color={colors.subText} strokeWidth={2} />
                        <Text style={[styles.specText, { color: colors.subText }]}>
                          {recipeDetail?.prepTime || '25 min prep'}
                        </Text>
                      </View>
                      <View style={styles.specDot} />
                      <View style={styles.specItem}>
                        <Flame size={13} color={colors.subText} strokeWidth={2} />
                        <Text style={[styles.specText, { color: colors.subText }]}>
                          {recipeDetail?.nutrition?.calories || 480} kcal
                        </Text>
                      </View>
                      <View style={styles.specDot} />
                      <View style={styles.specItem}>
                        <Text style={[styles.specText, { color: colors.subText }]}>
                          {recipeDetail?.nutrition?.protein || '26g'} protein
                        </Text>
                      </View>
                    </View>
                  </PressableScale>

                  {/* Expanded Recipe & Actions */}
                  {isExpanded && (
                    <View style={[styles.expandedContainer, { borderTopColor: colors.border }]}>
                      {loadingRecipe === entry.id ? (
                        <View style={{ paddingVertical: spacing[3] }}>
                          <SkeletonCard height={80} style={{ marginBottom: spacing[2] }} />
                          <SkeletonCard height={60} />
                          <Text style={[styles.loadingHint, { color: colors.subText }]}>
                            Generating chef instructions and ingredient measurements...
                          </Text>
                        </View>
                      ) : recipeDetail ? (
                        <View style={{ gap: spacing[3] }}>
                          {/* Ingredients */}
                          <View>
                            <View style={styles.sectionHeaderRow}>
                              <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                                INGREDIENTS
                              </Text>
                              <PressableScale
                                onPress={() => handleAddMissingToShopping(entry.recipe_name, recipeDetail)}
                                style={styles.shoppingListLink}
                              >
                                <ShoppingCart size={13} color={palette.forestDeep} strokeWidth={2.5} />
                                <Text style={[styles.shoppingListLinkText, { color: palette.forestDeep }]}>
                                  Add Missing to List
                                </Text>
                              </PressableScale>
                            </View>

                            <View style={styles.ingredientsGrid}>
                              {recipeDetail.ingredients.map((ing: any, i: number) => {
                                const inPantry = pantryItems.some(
                                  (p) =>
                                    (ing.name || '').toLowerCase().includes(p.name.toLowerCase()) ||
                                    p.name.toLowerCase().includes((ing.name || '').toLowerCase())
                                );
                                return (
                                  <View
                                    key={i}
                                    style={[
                                      styles.ingChip,
                                      {
                                        backgroundColor: inPantry
                                          ? mode === 'dark'
                                            ? 'rgba(2, 51, 45, 0.25)'
                                            : 'rgba(2, 51, 45, 0.08)'
                                          : colors.bg,
                                        borderColor: inPantry ? palette.forestDeep : colors.border,
                                      },
                                    ]}
                                  >
                                    {inPantry ? (
                                      <Check size={11} color={palette.forestDeep} strokeWidth={3} />
                                    ) : (
                                      <View
                                        style={[
                                          styles.missingDot,
                                          { backgroundColor: colors.subText },
                                        ]}
                                      />
                                    )}
                                    <Text
                                      style={[
                                        styles.ingText,
                                        {
                                          color: inPantry ? palette.forestDeep : colors.text,
                                          fontFamily: inPantry ? font.sansBold : font.sans,
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {ing.quantity ? `${ing.quantity} ` : ''}
                                      {ing.name}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>

                          {/* Cooking Instructions */}
                          {recipeDetail.instructions && recipeDetail.instructions.length > 0 && (
                            <View>
                              <Text style={[styles.subSectionTitle, { color: colors.text, marginBottom: spacing[2] }]}>
                                PREPARATION STEPS
                              </Text>
                              {recipeDetail.instructions.map((step: string, i: number) => (
                                <View key={i} style={styles.stepRow}>
                                  <View
                                    style={[
                                      styles.stepNumCircle,
                                      { backgroundColor: 'rgba(2, 51, 45, 0.1)' },
                                    ]}
                                  >
                                    <Text style={[styles.stepNumText, { color: palette.forestDeep }]}>
                                      {i + 1}
                                    </Text>
                                  </View>
                                  <Text style={[styles.stepBody, { color: colors.text }]}>{step}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.fallbackRecipeBox}>
                          <Text style={[styles.fallbackRecipeText, { color: colors.subText }]}>
                            Detailed recipe steps not yet loaded. Tap below to generate with AI.
                          </Text>
                          <SecondaryAction
                            label="Fetch Recipe Details"
                            onPress={() => fetchAiRecipe(entry.id, entry.recipe_name)}
                            icon={<ChefHat size={14} color={colors.text} strokeWidth={2} />}
                            size="sm"
                            style={{ alignSelf: 'flex-start', marginTop: spacing[2] }}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </SurfaceCard>
              );
            })}
          </View>
        ) : null}

        {/* ── Favorite Recipes Quick Add ── */}
        {favs.length > 0 && (
          <View style={{ marginTop: spacing[6] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Favorites Quick-Add</Text>
              <Text style={[type.monoBold, { color: colors.subText, fontSize: 11 }]}>
                TO {DAYS[activeDay].toUpperCase()}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
              {favs.map((favoriteName) => (
                <PressableScale
                  key={favoriteName}
                  onPress={() => {
                    hapticSuccess();
                    add(activeDay, 'Dinner', favoriteName);
                    toast.show(`Added "${favoriteName}" to ${DAYS[activeDay]} Dinner`, 'success');
                  }}
                  accessibilityLabel={`Add ${favoriteName} to meal plan`}
                >
                  <SurfaceCard style={styles.favChip}>
                    <Text style={[styles.favChipTitle, { color: colors.text }]} numberOfLines={1}>
                      {favoriteName}
                    </Text>
                    <View style={styles.favChipRight}>
                      <Plus size={14} color={palette.forestDeep} strokeWidth={2.5} />
                    </View>
                  </SurfaceCard>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Add Meal Bottom Sheet / Modal ── */}
      <AddMealModal
        visible={!!addModal}
        initialMeal={addModal?.meal || 'Lunch'}
        dayName={addModal ? DAYS[addModal.day] : ''}
        onClose={() => setAddModal(null)}
        onAdd={(mealType, recipeName) => {
          hapticSuccess();
          if (addModal) add(addModal.day, mealType, recipeName);
          setAddModal(null);
          toast.show(`Added "${recipeName}" to ${DAYS[addModal?.day || 0]} ${mealType}`, 'success');
        }}
      />
    </View>
  );
}

// ─── Add Meal Modal ──────────────────────────────────────────────
interface AddMealModalProps {
  visible: boolean;
  dayName: string;
  initialMeal: MealType;
  onClose: () => void;
  onAdd: (mealType: MealType, recipe: string) => void;
}

function AddMealModal({ visible, dayName, initialMeal, onClose, onAdd }: AddMealModalProps) {
  const { colors, mode } = useTheme();
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [recipe, setRecipe] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(CURATED_SUGGESTIONS);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const handleSearch = (text: string) => {
    setRecipe(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSuggestions(CURATED_SUGGESTIONS);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchMealSuggestions(text);
        if (res && res.length > 0) {
          setSuggestions(res);
        } else {
          setSuggestions([text]);
        }
      } catch (e) {
        setSuggestions([text]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Planned Meal</Text>
              <Text style={[styles.modalSub, { color: colors.subText }]}>
                Scheduling for {dayName}
              </Text>
            </View>
            <IconButton
              icon={<X size={18} color={colors.text} strokeWidth={2.5} />}
              onPress={onClose}
              accessibilityLabel="Close modal"
              size={36}
            />
          </View>

          {/* Meal Type Selector */}
          <Text style={[styles.fieldHeader, { color: colors.subText }]}>MEAL TIME</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((m) => {
              const isSelected = meal === m;
              return (
                <PressableScale
                  key={m}
                  onPress={() => {
                    hapticSelection();
                    setMeal(m);
                  }}
                  style={[
                    styles.mealTypeOption,
                    {
                      backgroundColor: isSelected ? palette.forestDeep : colors.bg,
                      borderColor: isSelected ? palette.forestDeep : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Select ${m}`}
                >
                  <Text
                    style={[
                      styles.mealTypeOptionText,
                      { color: isSelected ? palette.chalk : colors.text },
                    ]}
                  >
                    {m}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Recipe Name Search */}
          <Text style={[styles.fieldHeader, { color: colors.subText, marginTop: spacing[4] }]}>
            RECIPE OR DISH NAME
          </Text>
          <View
            style={[
              styles.searchBarWrap,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <Search size={18} color={colors.subText} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search or plan a meal"
              placeholderTextColor={colors.subText}
              value={recipe}
              onChangeText={handleSearch}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {recipe.length > 0 && (
              <PressableScale onPress={() => handleSearch('')} hitSlop={8}>
                <X size={16} color={colors.subText} strokeWidth={2} />
              </PressableScale>
            )}
          </View>

          {/* Suggestions List */}
          <View style={{ flex: 1, minHeight: 140, maxHeight: 200, marginTop: spacing[3] }}>
            <Text style={[styles.fieldHeader, { color: colors.subText, marginBottom: 8 }]}>
              {searching ? 'SEARCHING AI IDEAS...' : 'CURATED & INGREDIENT INSPIRATION'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                {suggestions.map((suggestionName, idx) => {
                  const isChosen = recipe.toLowerCase() === suggestionName.toLowerCase();
                  return (
                    <PressableScale
                      key={`${suggestionName}-${idx}`}
                      onPress={() => {
                        hapticSelection();
                        setRecipe(suggestionName);
                      }}
                      style={[
                        styles.suggestionItem,
                        {
                          backgroundColor: isChosen
                            ? mode === 'dark'
                              ? 'rgba(2, 51, 45, 0.25)'
                              : 'rgba(2, 51, 45, 0.08)'
                            : colors.bg,
                          borderColor: isChosen ? palette.forestDeep : colors.border,
                        },
                      ]}
                    >
                      <ChefHat
                        size={14}
                        color={isChosen ? palette.forestDeep : colors.subText}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.suggestionText,
                          {
                            color: isChosen ? palette.forestDeep : colors.text,
                            fontFamily: isChosen ? font.sansBold : font.sans,
                          },
                        ]}
                      >
                        {suggestionName}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Confirm Button */}
          <PrimaryAction
            label={`Confirm ${meal} Schedule`}
            onPress={() => onAdd(meal, recipe.trim() || 'Daily Balanced Plate')}
            icon={<Check size={18} color={palette.chalk} strokeWidth={2.5} />}
            style={{ marginTop: spacing[4] }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  weekStripCard: {
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  stripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dayStripContainer: {
    gap: 8,
    paddingHorizontal: 2,
  },
  dayChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    minWidth: 48,
  },
  dayText: {
    fontSize: 12,
    marginBottom: 2,
  },
  dayCountText: {
    fontSize: 15,
    fontFamily: font.sansBold,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    height: 5,
    alignItems: 'center',
  },
  mealDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  dayHeading: {
    fontSize: 22,
    fontFamily: font.sansBold,
    letterSpacing: -0.3,
  },
  mealCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cardHeaderPressable: {
    padding: spacing[4],
  },
  mealMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  mealTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 51, 45, 0.1)',
  },
  mealTypeText: {
    fontSize: 11,
    fontFamily: font.monoBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mealTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeTitle: {
    fontSize: 17,
    fontFamily: font.sansBold,
    flex: 1,
    paddingRight: spacing[2],
  },
  cardActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 12,
    fontFamily: font.sans,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(2, 51, 45, 0.25)',
  },
  expandedContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  loadingHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing[2],
    fontFamily: font.sans,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  subSectionTitle: {
    fontSize: 11,
    fontFamily: font.monoBold,
    letterSpacing: 0.8,
  },
  shoppingListLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shoppingListLinkText: {
    fontSize: 12,
    fontFamily: font.sansBold,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  missingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ingText: {
    fontSize: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 4,
  },
  stepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: font.monoBold,
  },
  stepBody: {
    fontSize: 13,
    fontFamily: font.sans,
    flex: 1,
    lineHeight: 18,
  },
  fallbackRecipeBox: {
    paddingVertical: spacing[2],
  },
  fallbackRecipeText: {
    fontSize: 13,
    fontFamily: font.sans,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: font.sansBold,
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 140,
    gap: 8,
  },
  favChipTitle: {
    fontSize: 13,
    fontFamily: font.sansBold,
    flex: 1,
  },
  favChipRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 51, 45, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing[5],
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: font.sansBold,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: font.sans,
    marginTop: 2,
  },
  fieldHeader: {
    fontSize: 10,
    fontFamily: font.monoBold,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  mealTypeOptionText: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: font.sans,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    flex: 1,
  },
});

export default function MealPlanScreen() {
  return <MealPlanView />;
}
