import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Plus, X, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { BrutalButton, GlassPanel, useTheme } from '@/components/ui';
import { useMealPlan, useFavorites } from '@/lib/hooks';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const RECIPE_NAMES = [
  'Rescue Stir-Fry', 'Green Power Bowl', 'Hearty Lentil Stew', 'Protein Scramble',
  'Roasted Root Plate', 'Mediterranean Salad', 'Chicken & Greens', 'Overnight Oats',
];

export default function MealPlanScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { plan, add, remove } = useMealPlan();
  const { favs } = useFavorites();
  const [addModal, setAddModal] = useState<{ day: number; meal: string } | null>(null);

  const grid = useMemo(() => {
    const g: Record<string, typeof plan> = {};
    for (const d of DAYS) g[d] = [];
    for (const entry of plan) {
      const dayName = DAYS[entry.day_of_week] ?? 'Mon';
      if (!g[dayName]) g[dayName] = [];
      g[dayName].push(entry);
    }
    return g;
  }, [plan]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={[type.display, { color: colors.text }]}>Meal Plan</Text>
          <Text style={[type.body, { color: colors.subText }]}>Plan your week to minimize waste</Text>
        </View>

        <View style={styles.weekGrid}>
          {DAYS.map((day, dayIdx) => (
            <View key={day} style={[styles.dayCol, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[styles.dayHead, { backgroundColor: colors.border }]}>
                <Text style={[type.monoBold, { color: colors.text, fontSize: 10 }]}>{day.toUpperCase()}</Text>
              </View>
              <View style={{ padding: spacing[1] }}>
                {(grid[day] ?? []).length === 0 ? (
                  <Text style={[type.bodySm, { color: colors.subText, fontSize: 11, textAlign: 'center', paddingVertical: 12 }]}>No meals</Text>
                ) : (
                  (grid[day] ?? []).map((entry) => (
                    <View key={entry.id} style={[styles.mealEntry, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                      <Text style={[type.bodySm, { color: colors.subText, fontSize: 9 }]}>{entry.meal_type}</Text>
                      <Text style={[type.bodySm, { color: colors.text, fontFamily: font.sansBold, marginTop: 2, fontSize: 11 }]} numberOfLines={2}>{entry.recipe_name}</Text>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); remove(entry.id); }} style={styles.delBtn}>
                        <Trash2 size={12} color={palette.danger} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                <TouchableOpacity style={[styles.addMealBtn, { borderColor: colors.border }]} onPress={() => { Haptics.selectionAsync(); setAddModal({ day: dayIdx, meal: 'Lunch' }); }}>
                  <Plus size={12} color={colors.subText} strokeWidth={2.5} />
                  <Text style={[type.bodySm, { color: colors.subText, fontSize: 10, marginLeft: 4 }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {favs.length > 0 && (
          <View style={{ marginTop: spacing[5] }}>
            <Text style={[type.h2, { color: colors.text, marginBottom: spacing[3] }]}>Favorites</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favs.map((f) => (
                <View key={f} style={[styles.favChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={[type.body, { color: colors.text }]}>{f}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <AddMealModal
          visible={!!addModal}
          onClose={() => setAddModal(null)}
          onAdd={(mealType, recipe) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (addModal) add(addModal.day, mealType, recipe);
            setAddModal(null);
          }}
        />
      </ScrollView>
    </View>
  );
}

function AddMealModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (meal: string, recipe: string) => void }) {
  const { colors } = useTheme();
  const [meal, setMeal] = useState('Lunch');
  const [recipe, setRecipe] = useState(RECIPE_NAMES[0]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GlassPanel style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add meal</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <X size={24} color={colors.subText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          
          <Text style={[type.body, { color: colors.subText, marginBottom: spacing[3] }]}>Which meal?</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealTypeBtn, { borderColor: colors.border }, meal === m && { backgroundColor: palette.sageDeep, borderColor: palette.sageDeep }]}
                onPress={() => { Haptics.selectionAsync(); setMeal(m); }}
              >
                <Text style={[type.bodySm, { color: meal === m ? palette.chalk : colors.text, fontFamily: font.sansBold }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[type.body, { color: colors.subText, marginBottom: spacing[3], marginTop: spacing[4] }]}>Which recipe?</Text>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {RECIPE_NAMES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.recipeRow, { borderColor: recipe === r ? palette.sageDeep : colors.border, backgroundColor: recipe === r ? palette.sageMist : colors.bg }]}
                onPress={() => { Haptics.selectionAsync(); setRecipe(r); }}
              >
                <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <BrutalButton variant="sage" onPress={() => onAdd(meal, recipe)} style={{ marginTop: spacing[5] }}>ADD TO PLAN</BrutalButton>
        </GlassPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing[3] },
  header: { marginBottom: spacing[4], paddingHorizontal: spacing[1], marginTop: spacing[3] },
  weekGrid: { flexDirection: 'row', gap: 6 },
  dayCol: { flex: 1, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  dayHead: { paddingVertical: spacing[2], alignItems: 'center' },
  mealEntry: { borderWidth: 1, padding: spacing[2], marginBottom: 6, position: 'relative', borderRadius: 6, paddingRight: 20 },
  delBtn: { position: 'absolute', top: 4, right: 4, padding: 4 },
  addMealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 6, paddingVertical: 8, marginTop: 4, borderStyle: 'dashed' },
  favChip: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1, borderRadius: 12, marginRight: spacing[3], shadowColor: palette.ink, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTypeBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  recipeRow: { borderWidth: 1, borderRadius: 12, padding: spacing[3], marginBottom: 8 },
});
