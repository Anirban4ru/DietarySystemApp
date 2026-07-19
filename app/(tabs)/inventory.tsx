import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Plus, AlertTriangle, X, BookOpen, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { Label, Pill, Bar, GlassPanel, BrutalButton, useTheme } from '@/components/ui';
import { useInventory, useImpact, useDisposals, useXp } from '@/lib/hooks';
import { InventoryRow, FoodCategory } from '@/lib/types';
import { FOOD_CATALOG, CATEGORY_LABELS, FOOD_BY_NAME, nutrientFraction } from '@/lib/foodCatalog';
import { getStorageTip, xpForConsumed } from '@/lib/features';

function daysLeft(row: InventoryRow): number {
  if (!row.expires_at) return 999;
  return Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000);
}

function urgency(row: InventoryRow): 'critical' | 'soon' | 'stable' {
  const d = daysLeft(row);
  if (d <= 1) return 'critical';
  if (d <= 3) return 'soon';
  return 'stable';
}

export default function InventoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, add, remove } = useInventory();
  const { logEvent } = useImpact();
  const { logDisposal } = useDisposals();
  const { addXp } = useXp();
  const [modal, setModal] = useState(false);
  const [tipModal, setTipModal] = useState<InventoryRow | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => daysLeft(a) - daysLeft(b)), [items]);
  const critical = sorted.filter((i) => urgency(i) === 'critical');
  const soon = sorted.filter((i) => urgency(i) === 'soon');

  const discard = async (row: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const food = FOOD_BY_NAME[row.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logDisposal(row.name, row.category, 'expired');
    await logEvent('item_discarded', co2, { name: row.name });
    await remove(row.id);
  };

  const consume = async (row: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const food = FOOD_BY_NAME[row.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logEvent('item_consumed', co2, { name: row.name });
    await addXp(xpForConsumed(co2));
    await remove(row.id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={[styles.scroll, { paddingTop: insets.top + spacing[4] }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={[type.display, { color: colors.text }]}>Pantry</Text>
          <Text style={[type.body, { color: colors.subText }]}>{items.length} items currently in stock</Text>
        </View>

        {(critical.length > 0 || soon.length > 0) && (
          <View style={[styles.alertBanner, { backgroundColor: palette.crimsonMist + '30', borderColor: palette.crimsonMist }]}>
            <AlertTriangle size={16} color={palette.crimson} strokeWidth={2.5} />
            <Text style={[type.bodySm, { color: palette.crimson, marginLeft: 8, flex: 1, fontFamily: font.sansBold }]}>
              {critical.length} expiring now · {soon.length} within 3 days
            </Text>
          </View>
        )}

        {loading && <Text style={[type.body, { color: colors.subText, padding: spacing[4], textAlign: 'center' }]}>Loading inventory...</Text>}

        {!loading && sorted.length === 0 && (
          <GlassPanel style={styles.empty}>
            <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>Your pantry is empty</Text>
            <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2], textAlign: 'center' }]}>
              Scan food with the camera or add it manually below.
            </Text>
          </GlassPanel>
        )}

        {sorted.map((row) => {
          const food = FOOD_BY_NAME[row.name.toLowerCase()];
          const d = daysLeft(row);
          const urg = urgency(row);
          const toneColor = urg === 'critical' ? palette.danger : urg === 'soon' ? palette.warning : palette.success;
          const tonePill: any = urg === 'critical' ? 'danger' : urg === 'soon' ? 'warning' : 'success';
          const frac = food ? nutrientFraction(food.fragility, Math.max(0, food.shelfLifeDays - d), food.shelfLifeDays) : 1;
          
          return (
            <View key={row.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.urgDot, { backgroundColor: toneColor }]} />
                <Text style={[type.h2, { color: colors.text, flex: 1 }]}>{row.name}</Text>
                <Pill tone={tonePill}>{d <= 0 ? 'Expired' : `${d}d left`}</Pill>
              </View>

              <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2] }]}>
                {row.quantity} {row.unit} · {CATEGORY_LABELS[row.category as FoodCategory]}
              </Text>

              {food && frac < 0.95 && (
                <View style={styles.nutriRow}>
                  <Text style={[type.bodySm, { color: colors.subText }]}>Nutrients</Text>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Bar value={frac} color={toneColor} track={colors.border} />
                  </View>
                  <Text style={[type.monoBold, { color: toneColor, fontSize: 10 }]}>{Math.round(frac * 100)}%</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: palette.sageDeep }]} onPress={() => consume(row)}>
                  <Check size={12} color={palette.sageDeep} strokeWidth={2.5} />
                  <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 9, marginLeft: 6 }]}>ATE IT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: palette.danger }]} onPress={() => discard(row)}>
                  <X size={12} color={palette.danger} strokeWidth={2.5} />
                  <Text style={[type.monoBold, { color: palette.danger, fontSize: 9, marginLeft: 6 }]}>TOSSED</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => { Haptics.selectionAsync(); setTipModal(row); }}>
                  <BookOpen size={12} color={colors.subText} strokeWidth={2.5} />
                  <Text style={[type.monoBold, { color: colors.subText, fontSize: 9, marginLeft: 6 }]}>TIPS</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModal(true); }}>
        <Plus size={24} color={palette.chalk} strokeWidth={2.5} />
      </TouchableOpacity>

      <AddModal visible={modal} onClose={() => setModal(false)} onAdd={add} />
      <TipModal row={tipModal} onClose={() => setTipModal(null)} />
    </View>
  );
}

function AddModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: any }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = FOOD_CATALOG.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);

  const pick = async (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onAdd({ name });
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GlassPanel style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add Manually</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <X size={24} color={colors.subText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
            placeholder="Search for an ingredient..."
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled>
            {filtered.map((f) => (
              <TouchableOpacity key={f.name} style={[styles.suggestRow, { borderBottomColor: colors.border }]} onPress={() => pick(f.name)}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: colors.text }]}>{f.name}</Text>
                  <Text style={[type.bodySm, { color: colors.subText }]}>{CATEGORY_LABELS[f.category]} · Lasts {f.shelfLifeDays} days</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassPanel>
      </View>
    </Modal>
  );
}

function TipModal({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!row) return null;
  const tip = getStorageTip(row.name);
  const food = FOOD_BY_NAME[row.name.toLowerCase()];
  return (
    <Modal visible={!!row} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GlassPanel style={[styles.modalPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>{row.name}</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <X size={24} color={colors.subText} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: spacing[3] }}>
            <Label>PROPER STORAGE</Label>
            <Text style={[type.body, { color: colors.text, marginTop: spacing[2] }]}>{tip}</Text>
          </View>
          {food && (
            <View style={{ marginTop: spacing[5] }}>
              <Label>NUTRITION SUMMARY</Label>
              <View style={styles.nutriGrid}>
                <NutriBox label="Calories" value={food.kcal} color={colors.text} borderColor={colors.border} />
                <NutriBox label="Protein" value={`${food.proteinG}g`} color={colors.text} borderColor={colors.border} />
                <NutriBox label="Carbs" value={`${food.carbG}g`} color={colors.text} borderColor={colors.border} />
                <NutriBox label="Fiber" value={`${food.fiberG}g`} color={colors.text} borderColor={colors.border} />
              </View>
            </View>
          )}
        </GlassPanel>
      </View>
    </Modal>
  );
}

function NutriBox({ label, value, color, borderColor }: { label: string; value: any; color: string, borderColor: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor, padding: spacing[3], flex: 1, minWidth: '47%', borderRadius: 12 }}>
      <Text style={[type.h2, { fontSize: 16, color }]}>{value}</Text>
      <Text style={[type.bodySm, { color: palette.mist, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: spacing[4] },
  header: { marginBottom: spacing[5] },
  alertBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], borderRadius: 12, borderWidth: 1 },
  empty: { padding: spacing[6], alignItems: 'center' },
  itemCard: { borderWidth: 1, borderRadius: 16, padding: spacing[4], marginBottom: spacing[3], shadowColor: palette.ink, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  urgDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing[3] },
  nutriRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3] },
  actionRow: { flexDirection: 'row', marginTop: spacing[4], gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fab: { position: 'absolute', right: spacing[5], bottom: spacing[6], width: 56, height: 56, borderRadius: 28, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', shadowColor: palette.ink, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: font.sans, fontSize: 15, marginBottom: spacing[4] },
  suggestRow: { paddingVertical: spacing[4], borderBottomWidth: 1 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing[3] },
});
