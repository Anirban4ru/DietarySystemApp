import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ScrollView, Animated, PanResponder, ActivityIndicator,
} from 'react-native';
import { Plus, AlertTriangle, X, BookOpen, Check, Trash2, Filter, SortAsc, Zap, ChefHat, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font, border } from '@/lib/theme';
import { Label, Pill, Bar, GlassPanel, BrutalButton, PressScale, SkeletonCard, useTheme, useToast, Loader, EmptyState } from '@/components/ui';
import { ShoppingBag } from 'lucide-react-native';
import { useInventory, useImpact, useDisposals, useXp } from '@/lib/hooks';
import { getTipInsight } from '@/lib/ai';
import { InventoryRow, FoodCategory } from '@/lib/types';
import { FOOD_CATALOG, CATEGORY_LABELS, FOOD_BY_NAME, nutrientFraction } from '@/lib/foodCatalog';
import { getStorageTip, xpForConsumed } from '@/lib/features';
import { parseNaturalLanguagePantry } from '@/lib/ai';

type SortKey = 'expiry' | 'name' | 'category';
type FilterKey = 'all' | 'critical' | 'soon' | 'stable';

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

function relativeExpiry(row: InventoryRow): string {
  const d = daysLeft(row);
  if (d <= 0) return 'Expired';
  if (d === 1) return 'Tomorrow';
  if (d <= 7) return `${d} days left`;
  return `${d}d`;
}

function freshnessColor(urg: 'critical' | 'soon' | 'stable'): string {
  if (urg === 'critical') return palette.danger;
  if (urg === 'soon') return palette.warning;
  return palette.success;
}

export default function InventoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, add, remove } = useInventory();
  const { logEvent } = useImpact();
  const { logDisposal } = useDisposals();
  const { addXp } = useXp();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [tipModal, setTipModal] = useState<InventoryRow | null>(null);
  const [sort, setSort] = useState<SortKey>('expiry');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showControls, setShowControls] = useState(false);

  const sorted = useMemo(() => {
    let list = [...items];
    if (filter !== 'all') list = list.filter((i) => urgency(i) === filter);
    if (sort === 'expiry') list.sort((a, b) => daysLeft(a) - daysLeft(b));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => a.category.localeCompare(b.category));
    return list;
  }, [items, sort, filter]);

  const critical = items.filter((i) => urgency(i) === 'critical');
  const soon = items.filter((i) => urgency(i) === 'soon');
  const urgentCount = critical.length + soon.length;

  const discard = async (row: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const food = FOOD_BY_NAME[row.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logDisposal(row.name, row.category, 'expired');
    await logEvent('item_discarded', co2, { name: row.name });
    await remove(row.id);
    toast.show(`${row.name} tossed 🗑️`, 'error');
  };

  const consume = async (row: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const food = FOOD_BY_NAME[row.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logEvent('item_consumed', co2, { name: row.name });
    await addXp(xpForConsumed(co2));
    await remove(row.id);
    toast.show(`${row.name} marked as eaten ✓`, 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }] as any}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8 } as any}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Pantry</Text>
            <Text style={[styles.screenSub, { color: colors.subText }]}>
              {items.length} items · {urgentCount > 0 ? `${urgentCount} need attention` : 'all fresh'}
            </Text>
          </View>
          <PressScale onPress={() => { Haptics.selectionAsync(); setShowControls((x) => !x); }}>
            <View style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: showControls ? palette.ink : colors.surface }] as any}>
              <Filter size={16} color={showControls ? palette.chalk : colors.subText} strokeWidth={2.5} />
            </View>
          </PressScale>
        </View>

        {/* Alert banner */}
        {(critical.length > 0 || soon.length > 0) && (
          <View style={[styles.alertBanner, { backgroundColor: '#FFF4F4', borderColor: palette.danger }] as any}>
            <AlertTriangle size={15} color={palette.danger} strokeWidth={2.5} />
            <Text style={[type.bodySm, { color: palette.danger, marginLeft: 8, flex: 1, fontFamily: font.sansBold }]}>
              {critical.length > 0 ? `${critical.length} expiring today` : ''}{critical.length > 0 && soon.length > 0 ? ' · ' : ''}{soon.length > 0 ? `${soon.length} expiring in 3 days` : ''}
            </Text>
          </View>
        )}

        {/* Sort / Filter controls */}
        {showControls && (
          <View style={[styles.controlsBox, { borderColor: colors.border, backgroundColor: colors.surface }] as any}>
            <Text style={[styles.controlLabel, { color: colors.subText }]}>FILTER</Text>
            <View style={styles.chipRow}>
              {(['all', 'critical', 'soon', 'stable'] as FilterKey[]).map((f) => (
                <PressScale key={f} onPress={() => setFilter(f)}>
                  <View style={[styles.controlChip, { backgroundColor: filter === f ? palette.ink : colors.bg, borderColor: filter === f ? palette.ink : colors.border }] as any}>
                    <Text style={[styles.controlChipText, { color: filter === f ? palette.chalk : colors.text }]}>{f}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
            <Text style={[styles.controlLabel, { color: colors.subText, marginTop: 10 }]}>SORT</Text>
            <View style={styles.chipRow}>
              {(['expiry', 'name', 'category'] as SortKey[]).map((s) => (
                <PressScale key={s} onPress={() => setSort(s)}>
                  <View style={[styles.controlChip, { backgroundColor: sort === s ? palette.sageDeep : colors.bg, borderColor: sort === s ? palette.sageDeep : colors.border }] as any}>
                    <Text style={[styles.controlChipText, { color: sort === s ? palette.chalk : colors.text }]}>{s}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </View>
        )}

        {/* Loading skeletons */}
        {loading && (
          <View style={{ marginTop: 8 }}>
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
          </View>
        )}

        {/* Empty state */}
        {!loading && sorted.length === 0 && (
          <EmptyState 
            icon={ShoppingBag} 
            title="Pantry is empty" 
            message="Scan food with the camera or tap + to add manually."
            actionLabel="ADD FIRST ITEM"
            onAction={() => setModal(true)}
          />
        )}

        {/* Items */}
        {sorted.map((row, idx) => (
          <ItemCard
            key={row.id}
            row={row}
            index={idx}
            colors={colors}
            onConsume={() => consume(row)}
            onDiscard={() => discard(row)}
            onTip={() => { Haptics.selectionAsync(); setTipModal(row); }}
          />
        ))}
      </ScrollView>

      {/* FAB */}
      <PressScale
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModal(true); }}
        style={[styles.fab, { bottom: insets.bottom + spacing[6] }]}
      >
        <View style={[styles.fabInner, { backgroundColor: palette.ink }]}>
          <Plus size={26} color={palette.chalk} strokeWidth={2.5} />
        </View>
      </PressScale>

      <AddModal visible={modal} onClose={() => setModal(false)} onAdd={add} />
      <TipModal row={tipModal} onClose={() => setTipModal(null)} />
    </View>
  );
}

// ─── Item Card ───────────────────────────────────────────────────
function ItemCard({ row, index, colors, onConsume, onDiscard, onTip }: {
  row: InventoryRow; index: number; colors: any;
  onConsume: () => void; onDiscard: () => void; onTip: () => void;
}) {
  const food = FOOD_BY_NAME[row.name.toLowerCase()];
  const d = daysLeft(row);
  const urg = urgency(row);
  const toneColor = freshnessColor(urg);
  const tonePill: any = urg === 'critical' ? 'danger' : urg === 'soon' ? 'warning' : 'success';
  const frac = food ? nutrientFraction(food.fragility, Math.max(0, food.shelfLifeDays - d), food.shelfLifeDays) : 1;

  const slideAnim = useRef(new Animated.Value(0)).current;
  useRef(() => {
    slideAnim.setValue(30);
    Animated.timing(slideAnim, {
      toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true,
    }).start();
  });

  const fadeIn = useRef(new Animated.Value(0)).current;
  useMemo(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Freshness stripe */}
        <View style={[styles.freshnessStripe, { backgroundColor: toneColor }]} />

        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={[styles.itemName, { color: colors.text }]}>{row.name}</Text>
            <Pill tone={tonePill}>{relativeExpiry(row)}</Pill>
          </View>

          <Text style={[type.bodySm, { color: colors.subText, marginTop: 4 }]}>
            {row.quantity} {row.unit} · {CATEGORY_LABELS[row.category as FoodCategory]}
          </Text>

          {food && frac < 0.95 && (
            <View style={styles.nutriRow}>
              <Text style={[type.bodySm, { color: colors.subText, width: 60 }]}>Nutrients</Text>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Bar value={frac} color={toneColor} track={colors.border} />
              </View>
              <Text style={[type.monoBold, { color: toneColor, fontSize: 11 }]}>{Math.round(frac * 100)}%</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <PressScale onPress={onConsume} style={[styles.actionBtn, { borderColor: palette.sageDeep, backgroundColor: '#F0F7F4' }]}>
              <Check size={13} color={palette.sageDeep} strokeWidth={2.8} />
              <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 10, marginLeft: 5 }]}>ATE IT</Text>
            </PressScale>
            <PressScale onPress={onDiscard} style={[styles.actionBtn, { borderColor: palette.danger, backgroundColor: '#FFF4F4' }]}>
              <Trash2 size={13} color={palette.danger} strokeWidth={2.5} />
              <Text style={[type.monoBold, { color: palette.danger, fontSize: 10, marginLeft: 5 }]}>TOSSED</Text>
            </PressScale>
            <PressScale onPress={onTip} style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}>
              <BookOpen size={13} color={colors.subText} strokeWidth={2.5} />
              <Text style={[type.monoBold, { color: colors.subText, fontSize: 10, marginLeft: 5 }]}>TIPS</Text>
            </PressScale>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Add Modal ───────────────────────────────────────────────────
function AddModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: any }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  
  const filtered = FOOD_CATALOG.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);

  const pick = async (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onAdd({ name });
    setQuery('');
    onClose();
  };

  const handleSmartParse = async () => {
    if (!query.trim()) return;
    setNlpLoading(true);
    try {
      const items = await parseNaturalLanguagePantry(query);
      if (items.length > 0) {
        for (const item of items) {
          await onAdd({ name: item.name, quantity: item.quantity, unit: item.unit });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show(`Added ${items.length} items from text`, 'success');
        setQuery('');
        onClose();
      } else {
        toast.show('Could not identify any food items.', 'info');
      }
    } catch (e) {
      toast.show('Failed to parse text', 'error');
    }
    setNlpLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add to Pantry</Text>
            <PressScale onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>
          <TextInput
            style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Type or dictate (e.g. '3 apples and milk')"
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          
          {query.trim().length > 3 && (
            <PressScale onPress={handleSmartParse} disabled={nlpLoading} style={{ marginBottom: spacing[3] }}>
              <View style={[styles.actionBtn, { backgroundColor: palette.ink, justifyContent: 'center' }]}>
                {nlpLoading ? <Loader /> : <Zap size={15} color={palette.chalk} strokeWidth={2.5} />}
                <Text style={[styles.actionBtnText, { color: palette.chalk, marginLeft: 8 }]}>
                  {nlpLoading ? 'PARSING...' : 'SMART ADD'}
                </Text>
              </View>
            </PressScale>
          )}
          <ScrollView style={{ maxHeight: 380 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((f) => (
              <PressScale key={f.name} onPress={() => pick(f.name)}>
                <View style={[styles.suggestRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>{f.name}</Text>
                    <Text style={[type.bodySm, { color: colors.subText }]}>{CATEGORY_LABELS[f.category]} · Lasts {f.shelfLifeDays} days</Text>
                  </View>
                  <Plus size={16} color={colors.subText} strokeWidth={2.5} />
                </View>
              </PressScale>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tip Modal ───────────────────────────────────────────────────
function TipModal({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
  const { colors } = useTheme();
  const [insight, setInsight] = useState<{ recipes: string[], freshness: string, calories: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (row) {
      setLoading(true);
      setInsight(null);
      getTipInsight(row.name, Math.max(0, daysLeft(row))).then(res => {
        setInsight(res);
        setLoading(false);
      });
    }
  }, [row]);

  if (!row) return null;
  const tip = getStorageTip(row.name);
  const food = FOOD_BY_NAME[row.name.toLowerCase()];
  return (
    <Modal visible={!!row} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>{row.name}</Text>
            <PressScale onPress={() => { Haptics.selectionAsync(); onClose(); }}>
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
              <Loader />
              <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[3] }]}>Generating AI insights...</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginTop: spacing[3] }}>
                <Label>PROPER STORAGE</Label>
                <Text style={[type.body, { color: colors.text, marginTop: spacing[2], lineHeight: 24 }]}>{insight?.freshness || tip}</Text>
              </View>

              {insight && insight.recipes.length > 0 && (
                <View style={{ marginTop: spacing[5] }}>
                  <Label>TOP RECIPES (TO USE IT UP)</Label>
                  {insight.recipes.map((r, i) => (
                    <View key={i} style={[styles.stepRow, { marginTop: spacing[2] }]}>
                      <View style={[styles.ingDot, { backgroundColor: palette.sageDeep, marginTop: 6 }]} />
                      <Text style={[type.body, { color: colors.text, flex: 1 }]}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: spacing[5], marginBottom: spacing[6] }}>
                <Label>NUTRITION (per 100g)</Label>
                <View style={styles.nutriGrid}>
                  <NutriBox label="Calories" value={insight?.calories || (food ? food.kcal.toString() : '-')} colors={colors} />
                  <NutriBox label="Protein" value={food ? `${food.proteinG}g` : '-'} colors={colors} />
                  <NutriBox label="Carbs" value={food ? `${food.carbG}g` : '-'} colors={colors} />
                  <NutriBox label="Fiber" value={food ? `${food.fiberG}g` : '-'} colors={colors} />
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function NutriBox({ label, value, colors }: { label: string; value: any; colors: any }) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: colors.border, padding: spacing[3], flex: 1, minWidth: '47%', borderRadius: 12, backgroundColor: colors.surface }}>
      <Text style={[type.h2, { fontSize: 18, color: colors.text }]}>{value}</Text>
      <Text style={[type.bodySm, { color: colors.subText, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  scroll:             { flex: 1, paddingHorizontal: spacing[4] },
  headerRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  screenTitle:        { fontSize: 28, fontFamily: font.sansBold, letterSpacing: -0.5 },
  screenSub:          { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  filterBtn:          { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  alertBanner:        { flexDirection: 'row', alignItems: 'center', padding: spacing[3], marginBottom: spacing[3], borderRadius: 12, borderWidth: 1.5 },
  controlsBox:        { borderWidth: 1.5, borderRadius: 14, padding: spacing[4], marginBottom: spacing[3] },
  controlLabel:       { fontSize: 10, fontFamily: font.sansBold, letterSpacing: 1, marginBottom: 8 },
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  controlChip:        { paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 20 },
  controlChipText:    { fontSize: 12, fontFamily: font.sansBold, textTransform: 'capitalize' },
  emptyBox:           { alignItems: 'center', padding: spacing[8], borderWidth: 1.5, borderRadius: 20, marginTop: spacing[4] },
  itemCard:           { flexDirection: 'row', borderWidth: 1.5, borderRadius: 16, marginBottom: spacing[3], overflow: 'hidden', shadowColor: palette.ink, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  freshnessStripe:    { width: 5 },
  itemContent:        { flex: 1, padding: spacing[4] },
  itemTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName:           { fontSize: 16, fontFamily: font.sansBold, flex: 1, marginRight: 8 },
  nutriRow:           { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3] },
  actionRow:          { flexDirection: 'row', marginTop: spacing[3], gap: 8 },
  actionBtn:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  actionBtnText:      { fontSize: 10, fontFamily: font.sansBold, letterSpacing: 1 },
  fab:                { position: 'absolute', right: spacing[5] } as any,
  fabInner:           { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: palette.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  modalOverlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing[5], paddingBottom: 40, paddingTop: 12 },
  modalHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.mist2, alignSelf: 'center', marginBottom: spacing[4] },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  closeBtn:           { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  searchInput:        { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.sans, fontSize: 15, marginBottom: spacing[3] },
  suggestRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1 },
  nutriGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing[3] },
  stepRow:            { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ingDot:             { width: 8, height: 8, borderRadius: 4 },
});
