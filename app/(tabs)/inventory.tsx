import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ScrollView, Animated, ActivityIndicator, Alert,
} from 'react-native';
import {
  Plus, AlertTriangle, X, Check, Trash2, Filter,
  ChefHat, Info, ShoppingBag, Snowflake, HeartHandshake,
  Search, Undo2, ArrowRight, Boxes, CheckCircle2,
  Sparkles, ChevronRight, BookOpen,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import {
  useTheme, SurfaceCard, MetricCard, StatusBadge,
  FreshnessBadge, PrimaryAction, SecondaryAction, IconButton,
  ConfirmDialog, useToast, SkeletonCard, EmptyState,
} from '@/components/ui';
import { PressableScale, FadeInStagger } from '@/components/motion';
import { useInventory, useImpact, useDisposals, useXp } from '@/lib/hooks';
import { getTipInsight, parseNaturalLanguagePantry } from '@/lib/ai';
import { InventoryRow, FoodCategory } from '@/lib/types';
import { FOOD_CATALOG, CATEGORY_LABELS, FOOD_BY_NAME } from '@/lib/foodCatalog';
import { getStorageTip, xpForConsumed } from '@/lib/features';
import { ShoppingView } from './shopping';

function daysLeft(expires_at: string | null): number {
  if (!expires_at) return 999;
  return Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000);
}

function getUrgencyGroup(row: InventoryRow): 'today' | 'week' | 'stable' {
  const d = daysLeft(row.expires_at);
  if (d <= 1) return 'today';
  if (d <= 7) return 'week';
  return 'stable';
}

export default function InventoryScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const { items, loading, add, remove } = useInventory();
  const { logEvent } = useImpact();
  const { logDisposal } = useDisposals();
  const { addXp } = useXp();

  const [activeSegment, setActiveSegment] = useState<'pantry' | 'grocery'>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tipItem, setTipItem] = useState<InventoryRow | null>(null);
  const [tipInsight, setTipInsight] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  // Manual Add Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<FoodCategory>('leafy_green');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemDays, setNewItemDays] = useState('7');

  // Undo cache
  const lastActionItem = useRef<{ item: InventoryRow; action: string } | null>(null);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Grouped by Urgency
  const todayItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'today'), [filteredItems]);
  const weekItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'week'), [filteredItems]);
  const stableItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'stable'), [filteredItems]);

  const urgentTotal = items.filter((i) => daysLeft(i.expires_at) <= 3).length;

  // Actions
  const handleConsume = async (item: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lastActionItem.current = { item, action: 'consumed' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logEvent('item_consumed', co2, { name: item.name });
    await addXp(xpForConsumed(co2));
    await remove(item.id);
    toast.show(`Eaten: ${item.name} (+${xpForConsumed(co2)} XP)`, 'success');
  };

  const handleFreeze = async (item: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newExpiry = new Date(Date.now() + 90 * 86400000).toISOString();
    await remove(item.id);
    await add({
      name: `${item.name} (Frozen)`,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      shelfLifeDays: 90,
    });
    await addXp(15);
    toast.show(`Frozen: ${item.name} (+90 days preservation)`, 'success');
  };

  const handleDonate = async (item: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lastActionItem.current = { item, action: 'donated' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.25;
    await logEvent('item_consumed', co2, { type: 'donation', name: item.name });
    await addXp(25);
    await remove(item.id);
    toast.show(`Donated: ${item.name} (+25 XP)`, 'success');
  };

  const handleDiscard = async (item: InventoryRow) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    lastActionItem.current = { item, action: 'discarded' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logDisposal(item.name, item.category, 'expired');
    await logEvent('item_discarded', co2, { name: item.name });
    await remove(item.id);
    toast.show(`Discarded: ${item.name}`, 'error');
  };

  const handleUndo = async () => {
    if (!lastActionItem.current) return;
    const { item } = lastActionItem.current;
    const days = Math.max(1, daysLeft(item.expires_at));
    await add({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      shelfLifeDays: days,
    });
    lastActionItem.current = null;
    toast.show(`Restored ${item.name} to pantry`, 'success');
  };

  const openStorageTip = async (item: InventoryRow) => {
    setTipItem(item);
    setLoadingTip(true);
    setTipInsight(null);
    try {
      const days = Math.max(0, daysLeft(item.expires_at));
      const insight = await getTipInsight(item.name, days);
      setTipInsight(`${insight.freshness}\n\nStorage Tip: ${getStorageTip(item.name)}`);
    } catch {
      setTipInsight(getStorageTip(item.name));
    } finally {
      setLoadingTip(false);
    }
  };

  const handleSaveNewItem = async () => {
    if (!newItemName.trim()) return;
    const days = parseInt(newItemDays, 10) || 7;
    await add({
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: parseFloat(newItemQty) || 1,
      unit: 'pcs',
      shelfLifeDays: days,
    });
    setNewItemName('');
    setAddModalVisible(false);
    toast.show(`Added ${newItemName.trim()} to pantry`, 'success');
  };

  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── TOP SEGMENTED SWITCHER ── */}
      <View style={[styles.segmentContainer, { paddingTop: insets.top + 8, backgroundColor: colors.surface }]}>
        <View style={[styles.segmentTrack, { backgroundColor: colors.paperBg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentTab, activeSegment === 'pantry' && { backgroundColor: palette.sageDeep }]}
            onPress={() => { Haptics.selectionAsync(); setActiveSegment('pantry'); }}
            accessibilityRole="tab"
            accessibilityLabel="Pantry Inventory tab"
            accessibilityState={{ selected: activeSegment === 'pantry' }}
          >
            <Boxes size={15} color={activeSegment === 'pantry' ? palette.chalk : colors.subText} strokeWidth={2.2} />
            <Text style={[styles.segmentLabel, { color: activeSegment === 'pantry' ? palette.chalk : colors.subText }]}>
              Pantry Inventory
            </Text>
            {urgentTotal > 0 && (
              <View style={styles.segmentBadge}>
                <Text style={styles.segmentBadgeText}>{urgentTotal}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeSegment === 'grocery' && { backgroundColor: palette.sageDeep }]}
            onPress={() => { Haptics.selectionAsync(); setActiveSegment('grocery'); }}
            accessibilityRole="tab"
            accessibilityLabel="Smart Grocery List tab"
            accessibilityState={{ selected: activeSegment === 'grocery' }}
          >
            <ShoppingBag size={15} color={activeSegment === 'grocery' ? palette.chalk : colors.subText} strokeWidth={2.2} />
            <Text style={[styles.segmentLabel, { color: activeSegment === 'grocery' ? palette.chalk : colors.subText }]}>
              Smart Grocery
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── EMBEDDED SMART GROCERY LIST IF SELECTED ── */}
      {activeSegment === 'grocery' ? (
        <ShoppingView embedded={true} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 20,
            paddingTop: 12,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Subtitle */}
          <View style={styles.titleRow}>
            <View>
              <Text style={[type.display, { color: colors.text }]}>Pantry</Text>
              <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
                {items.length} items total • {urgentTotal > 0 ? `${urgentTotal} urgent items` : 'all fresh'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {lastActionItem.current && (
                <IconButton
                  icon={Undo2}
                  onPress={handleUndo}
                  accessibilityLabel="Undo last pantry action"
                  color={palette.amberDeep}
                  bg={colors.surface}
                />
              )}
              <IconButton
                icon={Plus}
                onPress={() => setAddModalVisible(true)}
                accessibilityLabel="Add manual pantry item"
                color={palette.sageDeep}
                bg={colors.surface}
              />
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.subText} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search pantry items..."
              placeholderTextColor={colors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                <X size={16} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {['all', 'produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen'].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? palette.sageDeep : colors.surface,
                      borderColor: isSelected ? palette.sageDeep : colors.border,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${cat}`}
                >
                  <Text style={[styles.catChipText, { color: isSelected ? palette.chalk : colors.text }]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Loading Skeleton */}
          {loading && (
            <View style={{ gap: 10, marginTop: 12 }}>
              <SkeletonCard height={88} />
              <SkeletonCard height={88} />
              <SkeletonCard height={88} />
            </View>
          )}

          {/* ── SECTION 1: USE TODAY (Urgent) ── */}
          {todayItems.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBullet, { backgroundColor: palette.crimson }]} />
                <Text style={[type.h2, { color: palette.crimson }]}>Use Today / Tomorrow</Text>
                <View style={[styles.sectionCountBadge, { backgroundColor: palette.crimsonMist }]}>
                  <Text style={[type.monoBold, { color: palette.crimson, fontSize: 10 }]}>{todayItems.length}</Text>
                </View>
              </View>

              {todayItems.map((item) => (
                <PantryItemCard
                  key={item.id}
                  item={item}
                  onConsume={() => handleConsume(item)}
                  onFreeze={() => handleFreeze(item)}
                  onDonate={() => handleDonate(item)}
                  onDiscard={() => handleDiscard(item)}
                  onTip={() => openStorageTip(item)}
                  onRescue={() => router.push('/(tabs)/recipes')}
                />
              ))}
            </View>
          )}

          {/* ── SECTION 2: USE THIS WEEK (Soon) ── */}
          {weekItems.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBullet, { backgroundColor: palette.amberDeep }]} />
                <Text style={[type.h2, { color: colors.text }]}>Use This Week</Text>
                <View style={[styles.sectionCountBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 10 }]}>{weekItems.length}</Text>
                </View>
              </View>

              {weekItems.map((item) => (
                <PantryItemCard
                  key={item.id}
                  item={item}
                  onConsume={() => handleConsume(item)}
                  onFreeze={() => handleFreeze(item)}
                  onDonate={() => handleDonate(item)}
                  onDiscard={() => handleDiscard(item)}
                  onTip={() => openStorageTip(item)}
                  onRescue={() => router.push('/(tabs)/recipes')}
                />
              ))}
            </View>
          )}

          {/* ── SECTION 3: STABLE & SHELF-SAFE ── */}
          {stableItems.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBullet, { backgroundColor: palette.sageDeep }]} />
                <Text style={[type.h2, { color: colors.text }]}>Stable & Shelf-Safe</Text>
                <View style={[styles.sectionCountBadge, { backgroundColor: palette.sageMist }]}>
                  <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 10 }]}>{stableItems.length}</Text>
                </View>
              </View>

              {stableItems.map((item) => (
                <PantryItemCard
                  key={item.id}
                  item={item}
                  onConsume={() => handleConsume(item)}
                  onFreeze={() => handleFreeze(item)}
                  onDonate={() => handleDonate(item)}
                  onDiscard={() => handleDiscard(item)}
                  onTip={() => openStorageTip(item)}
                  onRescue={() => router.push('/(tabs)/recipes')}
                />
              ))}
            </View>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <EmptyState
              icon={Boxes}
              title={searchQuery ? 'No Matching Items' : 'Pantry is Empty'}
              message={
                searchQuery
                  ? `No pantry items matched "${searchQuery}". Clear your search or scan fresh groceries.`
                  : 'Start by scanning your groceries or adding food items to track shelf-life and rescue recipes.'
              }
              actionLabel="Scan Groceries"
              onAction={() => router.push('/scan')}
            />
          )}
        </ScrollView>
      )}

      {/* ── CONTEXTUAL STORAGE TIP MODAL ── */}
      {tipItem && (
        <Modal transparent animationType="fade" visible={Boolean(tipItem)}>
          <View style={styles.modalBackdrop}>
            <SurfaceCard style={styles.tipCard} variant="elevated">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={20} color={palette.sageDeep} strokeWidth={2.2} />
                  <Text style={[type.h2, { color: colors.text }]}>{tipItem.name} Storage</Text>
                </View>
                <TouchableOpacity onPress={() => setTipItem(null)} accessibilityLabel="Close storage tips">
                  <X size={20} color={colors.subText} />
                </TouchableOpacity>
              </View>

              {loadingTip ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={palette.sageDeep} />
                  <Text style={[type.bodySm, { color: colors.subText, marginTop: 8 }]}>Loading preservation tips...</Text>
                </View>
              ) : (
                <Text style={[type.body, { color: colors.text, lineHeight: 22 }]}>
                  {tipInsight || getStorageTip(tipItem.name)}
                </Text>
              )}

              <View style={{ marginTop: spacing[5] }}>
                <PrimaryAction label="Got it" onPress={() => setTipItem(null)} variant="sage" />
              </View>
            </SurfaceCard>
          </View>
        </Modal>
      )}

      {/* ── MANUAL ADD MODAL ── */}
      {addModalVisible && (
        <Modal transparent animationType="slide" visible={addModalVisible}>
          <View style={styles.modalBackdrop}>
            <SurfaceCard style={styles.tipCard} variant="elevated">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[type.h2, { color: colors.text }]}>Add Pantry Item</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} accessibilityLabel="Close add modal">
                  <X size={20} color={colors.subText} />
                </TouchableOpacity>
              </View>

              <Text style={[type.label, { color: colors.subText, marginBottom: 4 }]}>FOOD NAME</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Organic Baby Spinach"
                placeholderTextColor={colors.subText}
                value={newItemName}
                onChangeText={setNewItemName}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.label, { color: colors.subText, marginBottom: 4 }]}>QUANTITY</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    keyboardType="numeric"
                    value={newItemQty}
                    onChangeText={setNewItemQty}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.label, { color: colors.subText, marginBottom: 4 }]}>DAYS LEFT</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    keyboardType="numeric"
                    value={newItemDays}
                    onChangeText={setNewItemDays}
                  />
                </View>
              </View>

              <View style={{ marginTop: spacing[5], gap: 10 }}>
                <PrimaryAction label="Save Item" onPress={handleSaveNewItem} variant="sage" />
                <SecondaryAction label="Cancel" onPress={() => setAddModalVisible(false)} />
              </View>
            </SurfaceCard>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PANTRY ITEM CARD COMPONENT
// ─────────────────────────────────────────────────────────────────

interface PantryItemCardProps {
  item: InventoryRow;
  onConsume: () => void;
  onFreeze: () => void;
  onDonate: () => void;
  onDiscard: () => void;
  onTip: () => void;
  onRescue: () => void;
}

function PantryItemCard({
  item,
  onConsume,
  onFreeze,
  onDonate,
  onDiscard,
  onTip,
  onRescue,
}: PantryItemCardProps) {
  const { colors } = useTheme();
  const days = daysLeft(item.expires_at);

  return (
    <SurfaceCard style={styles.itemCard} variant="elevated">
      <View style={styles.itemMainRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FreshnessBadge daysLeft={days} />
            <Text style={[type.monoBold, { color: colors.subText, fontSize: 11, textTransform: 'capitalize' }]}>
              {item.category.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold, fontSize: 16 }]}>
            {item.name}
          </Text>
          <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
            {item.quantity ? `${item.quantity} ${item.unit || ''}` : '1 package'}
          </Text>
        </View>

        {/* Tip & Rescue CTAs */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <TouchableOpacity
            onPress={onTip}
            style={[styles.tipBtn, { backgroundColor: colors.paperBg, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Storage tips for ${item.name}`}
          >
            <Info size={14} color={palette.sageDeep} />
            <Text style={[type.monoBold, { color: palette.sageDeep, fontSize: 10, marginLeft: 4 }]}>TIPS</Text>
          </TouchableOpacity>

          {days <= 3 && (
            <TouchableOpacity
              onPress={onRescue}
              style={[styles.rescuePill, { backgroundColor: '#FEF3C7' }]}
              accessibilityRole="button"
              accessibilityLabel={`Find rescue recipes for ${item.name}`}
            >
              <ChefHat size={12} color={palette.amberDeep} />
              <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 10, marginLeft: 4 }]}>RESCUE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4 Action Buttons Row: Consumed, Freeze, Donate, Discard */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onConsume}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as consumed`}
        >
          <Check size={16} color={palette.sageDeep} strokeWidth={2.4} />
          <Text style={[styles.actionBtnText, { color: palette.sageDeep }]}>Eaten</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onFreeze}
          accessibilityRole="button"
          accessibilityLabel={`Freeze ${item.name}`}
        >
          <Snowflake size={15} color="#0284C7" strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Freeze</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDonate}
          accessibilityRole="button"
          accessibilityLabel={`Donate ${item.name}`}
        >
          <HeartHandshake size={15} color={palette.amberDeep} strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: palette.amberDeep }]}>Donate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel={`Discard ${item.name}`}
        >
          <Trash2 size={15} color={palette.crimson} strokeWidth={2.2} />
          <Text style={[styles.actionBtnText, { color: palette.crimson }]}>Discard</Text>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
    minHeight: 44,
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: font.sansBold,
    letterSpacing: 0.3,
  },
  segmentBadge: {
    backgroundColor: palette.crimson,
    paddingHorizontal: 5,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: palette.chalk,
    fontSize: 9,
    fontFamily: font.sansBold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: spacing[3],
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: font.sans,
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: spacing[4],
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  catChipText: {
    fontFamily: font.sansBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionWrap: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBullet: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  itemCard: {
    padding: spacing[3],
    borderRadius: 18,
    marginBottom: 10,
  },
  itemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
  },
  rescuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minHeight: 32,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
  actionBtnText: {
    fontFamily: font.sansBold,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tipCard: {
    width: '100%',
    maxWidth: 380,
    padding: spacing[5],
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: font.sans,
    fontSize: 14,
  },
});
