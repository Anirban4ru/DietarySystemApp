import { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Animated, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Plus, X, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { BrutalButton, PressScale, useTheme, Loader, Pill, Label, Divider } from '@/components/ui';
import { useMealPlan, useFavorites } from '@/lib/hooks';
import { searchMealByName, searchMealSuggestions } from '@/lib/ai';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const RECIPE_NAMES = [
  'Rescue Stir-Fry', 'Green Power Bowl', 'Hearty Lentil Stew', 'Protein Scramble',
  'Roasted Root Plate', 'Mediterranean Salad', 'Chicken & Greens', 'Overnight Oats',
];

function todayDayIndex(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // convert to Mon=0
}

export default function MealPlanScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, add, remove } = useMealPlan();
  const { favs } = useFavorites();
  const [activeDay, setActiveDay] = useState(todayDayIndex());
  const [addModal, setAddModal] = useState<{ day: number; meal: string } | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [aiRecipes, setAiRecipes] = useState<Record<string, any>>({});
  const [loadingRecipe, setLoadingRecipe] = useState<string | null>(null);

  const fetchAiRecipe = async (id: string, name: string) => {
    if (aiRecipes[id]) return;
    setLoadingRecipe(id);
    try {
      const res = await searchMealByName(name);
      setAiRecipes(prev => ({ ...prev, [id]: res }));
    } catch (e) {
      console.warn("AI Recipe failed", e);
    } finally {
      setLoadingRecipe(null);
    }
  };

  const dayPlan = useMemo(() => {
    return plan.filter((e) => e.day_of_week === activeDay);
  }, [plan, activeDay]);

  const totalMeals = plan.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Meal Plan</Text>
            <Text style={[styles.screenSub, { color: colors.subText }]}>
              {totalMeals} meals planned this week
            </Text>
          </View>
          <View style={[styles.calIcon, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Calendar size={20} color={palette.sageDeep} strokeWidth={2.5} />
          </View>
        </View>

        {/* Day strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[4] }}>
          <View style={styles.dayStrip}>
            {DAYS.map((day, idx) => {
              const isActive = idx === activeDay;
              const isToday = idx === todayDayIndex();
              const count = plan.filter((e) => e.day_of_week === idx).length;
              return (
                <PressScale
                  key={day}
                  onPress={() => { Haptics.selectionAsync(); setActiveDay(idx); }}
                >
                  <View style={[
                    styles.dayChip,
                    {
                      backgroundColor: isActive ? palette.ink : colors.surface,
                      borderColor: isActive ? palette.ink : colors.border,
                      borderWidth: isToday && !isActive ? 2 : 1.5,
                      borderStyle: isToday && !isActive ? 'dashed' : 'solid' as any,
                    },
                  ]}>
                    <Text style={[styles.dayLabel, { color: isActive ? palette.chalk : colors.subText }]}>
                      {day}
                    </Text>
                    {count > 0 ? (
                      <View style={[styles.dayDot, { backgroundColor: isActive ? palette.sageMist : palette.sageDeep }]} />
                    ) : (
                      <View style={{ height: 6, width: 6 }} />
                    )}
                  </View>
                </PressScale>
              );
            })}
          </View>
        </ScrollView>

        {/* Day header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayName, { color: colors.text }]}>{DAYS[activeDay]}</Text>
          {activeDay === todayDayIndex() && (
            <View style={[styles.todayBadge, { backgroundColor: palette.sageDeep }]}>
              <Text style={[type.monoBold, { color: palette.chalk, fontSize: 9 }]}>TODAY</Text>
            </View>
          )}
        </View>

        {/* Meal list for active day */}
        {dayPlan.length === 0 ? (
          <View style={[styles.emptyDay, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 36, marginBottom: spacing[3] }}>🍽️</Text>
            <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>No meals yet</Text>
            <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2], textAlign: 'center' }]}>
              Plan your meals below to reduce food waste
            </Text>
          </View>
        ) : (
          dayPlan.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            return (
              <PressScale
                key={entry.id}
                onPress={() => { 
                  Haptics.selectionAsync(); 
                  const isNowExpanded = !isExpanded;
                  setExpandedEntry(isNowExpanded ? entry.id : null); 
                  if (isNowExpanded && !aiRecipes[entry.id]) {
                    fetchAiRecipe(entry.id, entry.recipe_name);
                  }
                }}
              >
                <View style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.mealCardTop}>
                    <View>
                      <Text style={[styles.mealType, { color: colors.subText }]}>{entry.meal_type}</Text>
                      <Text style={[styles.mealName, { color: colors.text }]}>{entry.recipe_name}</Text>
                    </View>
                    <View style={styles.mealCardRight}>
                      {isExpanded
                        ? <ChevronUp size={16} color={colors.subText} strokeWidth={2.5} />
                        : <ChevronDown size={16} color={colors.subText} strokeWidth={2.5} />}
                      <PressScale onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); remove(entry.id); }}>
                        <Trash2 size={16} color={palette.danger} strokeWidth={2.5} style={{ marginLeft: 12 }} />
                      </PressScale>
                    </View>
                  </View>
                  {isExpanded && (
                    <View style={[styles.mealExpanded, { borderTopColor: colors.border }]}>
                      {loadingRecipe === entry.id ? (
                        <View style={{ alignItems: 'center', padding: spacing[4] }}>
                          <Loader />
                          <Text style={[type.bodySm, { color: colors.subText, marginTop: 8 }]}>AI is writing your recipe...</Text>
                        </View>
                      ) : aiRecipes[entry.id] ? (
                        <View style={{ marginTop: spacing[2] }}>
                          <Label>INGREDIENTS</Label>
                          {aiRecipes[entry.id].ingredients.map((ing: any, i: number) => (
                            <View key={i} style={styles.ingRow}>
                              <View style={[styles.ingDot, { backgroundColor: palette.sageDeep }]} />
                              <Text style={[type.body, { color: colors.text }]}>{ing.name}</Text>
                            </View>
                          ))}
                          <Divider color={colors.border} />
                          <Label>HOW TO COOK</Label>
                          {aiRecipes[entry.id].instructions.map((step: string, i: number) => (
                            <View key={i} style={styles.stepRow}>
                              <Text style={[type.monoBold, { color: palette.sageDeep, width: 20 }]}>{i+1}.</Text>
                              <Text style={[type.bodySm, { color: colors.text, flex: 1 }]}>{step}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={[type.bodySm, { color: colors.subText }]}>
                          Could not load recipe. Tap Rescue tab for pantry meals.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </PressScale>
            );
          })
        )}

        {/* Add button */}
        <BrutalButton
          variant="outline"
          onPress={() => { Haptics.selectionAsync(); setAddModal({ day: activeDay, meal: 'Lunch' }); }}
          style={{ marginTop: spacing[3] }}
        >
          <Plus size={16} color={palette.ink} strokeWidth={2.5} />
          <Text style={[type.label, { color: palette.ink }]}>ADD MEAL TO {DAYS[activeDay].toUpperCase()}</Text>
        </BrutalButton>

        {/* Favorites horizontal scroll */}
        {favs.length > 0 && (
          <View style={{ marginTop: spacing[6] }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: spacing[3] }]}>Favourite Recipes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favs.map((f) => (
                <PressScale
                  key={f}
                  onPress={() => { Haptics.selectionAsync(); setAddModal({ day: activeDay, meal: 'Dinner' }); }}
                >
                  <View style={[styles.favChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>{f}</Text>
                    <Plus size={14} color={palette.sageDeep} strokeWidth={2.5} style={{ marginTop: 4 }} />
                  </View>
                </PressScale>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <AddMealModal
        visible={!!addModal}
        onClose={() => setAddModal(null)}
        onAdd={(mealType, recipe) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (addModal) add(addModal.day, mealType, recipe);
          setAddModal(null);
        }}
      />
    </View>
  );
}

// ─── Add Meal Modal ──────────────────────────────────────────────
function AddMealModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (meal: string, recipe: string) => void }) {
  const { colors } = useTheme();
  const [meal, setMeal] = useState('Lunch');
  const [recipe, setRecipe] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(RECIPE_NAMES);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const handleSearch = (text: string) => {
    setRecipe(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setSuggestions(RECIPE_NAMES);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchMealSuggestions(text);
        if (res.length > 0) {
          setSuggestions(res);
        } else {
          setSuggestions([text]); // Fallback to what they typed
        }
      } catch (e) {
        setSuggestions([text]);
      } finally {
        setSearching(false);
      }
    }, 800) as any;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add Meal</Text>
            <PressScale onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>

          <Text style={[styles.modalSectionLabel, { color: colors.subText }]}>MEAL TYPE</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map((m) => (
              <PressScale key={m} onPress={() => { Haptics.selectionAsync(); setMeal(m); }}>
                <View style={[styles.optionChip, {
                  backgroundColor: meal === m ? palette.ink : colors.surface,
                  borderColor: meal === m ? palette.ink : colors.border,
                }]}>
                  <Text style={[styles.optionChipText, { color: meal === m ? palette.chalk : colors.text }]}>{m}</Text>
                </View>
              </PressScale>
            ))}
          </View>

          <Text style={[styles.modalSectionLabel, { color: colors.subText, marginTop: spacing[4] }]}>RECIPE OR FOOD NAME</Text>
          
          <TextInput
            style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="e.g. Chicken Tikka Masala..."
            placeholderTextColor={colors.subText}
            value={recipe}
            onChangeText={handleSearch}
          />

          <ScrollView style={{ maxHeight: 180, marginTop: spacing[3] }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalSectionLabel, { color: colors.subText }]}>
              {searching ? 'SEARCHING AI...' : (recipe.length >= 3 ? 'AI SUGGESTIONS' : 'OR CHOOSE SUGGESTION')}
            </Text>
            {suggestions.map((r, i) => (
              <PressScale key={`${r}-${i}`} onPress={() => { Haptics.selectionAsync(); setRecipe(r); }}>
                <View style={[styles.recipeRow, {
                  backgroundColor: recipe === r ? palette.sageMist : colors.surface,
                  borderColor: recipe === r ? palette.sageDeep : colors.border,
                }]}>
                  {recipe === r && <View style={styles.recipeDot} />}
                  <Text style={[type.body, { color: recipe === r ? palette.sageDeep : colors.text, fontFamily: font.sansBold, flex: 1 }]}>{r}</Text>
                </View>
              </PressScale>
            ))}
          </ScrollView>

          <BrutalButton variant="sage" onPress={() => onAdd(meal, recipe || 'Quick Meal')} style={{ marginTop: spacing[4] }}>
            <Plus size={16} color={palette.chalk} strokeWidth={2.5} />
            <Text style={[type.label, { color: palette.chalk }]}>ADD TO PLAN</Text>
          </BrutalButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scroll:         { flex: 1, paddingHorizontal: spacing[4] },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  screenTitle:    { fontSize: 28, fontFamily: font.sansBold, letterSpacing: -0.5 },
  screenSub:      { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  calIcon:        { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayStrip:       { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  dayChip:        { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, minWidth: 52 },
  dayLabel:       { fontSize: 13, fontFamily: font.sansBold },
  dayDot:         { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  dayHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing[3] },
  dayName:        { fontSize: 22, fontFamily: font.sansBold },
  todayBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emptyDay:       { alignItems: 'center', padding: spacing[8], borderWidth: 1.5, borderRadius: 18, borderStyle: 'dashed' as any, marginBottom: spacing[4] },
  mealCard:       { borderWidth: 1.5, borderRadius: 14, marginBottom: spacing[3], overflow: 'hidden' },
  mealCardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4] },
  mealType:       { fontSize: 11, fontFamily: font.sansBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  mealName:       { fontSize: 16, fontFamily: font.sansBold, marginTop: 2 },
  mealCardRight:  { flexDirection: 'row', alignItems: 'center' },
  mealExpanded:   { paddingHorizontal: spacing[4], paddingBottom: spacing[4], paddingTop: spacing[3], borderTopWidth: 1 },
  sectionTitle:   { fontSize: 16, fontFamily: font.sansBold },
  favChip:        { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1.5, borderRadius: 14, marginRight: spacing[3], minWidth: 130, alignItems: 'center' },
  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing[5], paddingBottom: 40, paddingTop: 12 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.mist2, alignSelf: 'center', marginBottom: spacing[4] },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalSectionLabel: { fontSize: 10, fontFamily: font.sansBold, letterSpacing: 1, marginBottom: 10, color: palette.mist },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:     { paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1.5, borderRadius: 12 },
  optionChipText: { fontSize: 13, fontFamily: font.sansBold },
  recipeRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: spacing[3], marginBottom: 8 },
  recipeDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.sageDeep, marginRight: 10 },
  ingRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  ingDot:         { width: 6, height: 6, borderRadius: 3 },
  stepRow:        { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, gap: 8 },
  searchInput:    { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.sans, fontSize: 15, marginBottom: spacing[3] },
});
