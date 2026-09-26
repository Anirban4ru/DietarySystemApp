import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ScrollView, Animated, ActivityIndicator, Alert, SectionList,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import {
  Plus, AlertTriangle, X, Check, Trash2, Filter,
  ChefHat, Info, ShoppingBag, Snowflake, HeartHandshake,
  Search, Undo2, ArrowRight, Boxes, CheckCircle2,
  ChevronRight, BookOpen,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { hapticSuccess, hapticSelection, hapticWarning } from '@/lib/haptics';
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
import { PantryItemCard } from '@/components/inventory/PantryItemCard';

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

  const todayItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'today'), [filteredItems]);
  const weekItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'week'), [filteredItems]);
  const stableItems = useMemo(() => filteredItems.filter((i) => getUrgencyGroup(i) === 'stable'), [filteredItems]);

  const sections = useMemo(() => {
    const list: {
      title: string;
      color: string;
      badgeBg: string;
      textColor: string;
      data: InventoryRow[];
    }[] = [];
    if (todayItems.length > 0) {
      list.push({
        title: 'Use Today / Tomorrow',
        color: palette.crimson,
        badgeBg: palette.crimsonMist,
        textColor: palette.crimson,
        data: todayItems,
      });
    }
    if (weekItems.length > 0) {
      list.push({
        title: 'Use This Week',
        color: palette.amberDeep,
        badgeBg: palette.goldMist,
        textColor: palette.amberDeep,
        data: weekItems,
      });
    }
    if (stableItems.length > 0) {
      list.push({
        title: 'Stable & Shelf-Safe',
        color: palette.sageDeep,
        badgeBg: palette.sageMist,
        textColor: palette.sageDeep,
        data: stableItems,
      });
    }
    return list;
  }, [todayItems, weekItems, stableItems]);

  const urgentTotal = items.filter((i) => daysLeft(i.expires_at) <= 3).length;

  // Actions
  const handleConsume = useCallback(async (item: InventoryRow) => {
    hapticSuccess();
    lastActionItem.current = { item, action: 'consumed' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logEvent('item_consumed', co2, { name: item.name });
    await addXp(xpForConsumed(co2));
    await remove(item.id);
    toast.show(`Eaten: ${item.name} (+${xpForConsumed(co2)} XP)`, 'success');
  }, [logEvent, addXp, remove, toast]);

  const handleFreeze = useCallback(async (item: InventoryRow) => {
    hapticSuccess();
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
  }, [remove, add, addXp, toast]);

  const handleDonate = useCallback(async (item: InventoryRow) => {
    hapticSuccess();
    lastActionItem.current = { item, action: 'donated' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.25;
    await logEvent('item_consumed', co2, { type: 'donation', name: item.name });
    await addXp(25);
    await remove(item.id);
    toast.show(`Donated: ${item.name} (+25 XP)`, 'success');
  }, [logEvent, addXp, remove, toast]);

  const handleDiscard = useCallback(async (item: InventoryRow) => {
    hapticWarning();
    lastActionItem.current = { item, action: 'discarded' };
    const food = FOOD_BY_NAME[item.name.toLowerCase()];
    const co2 = (food?.co2ePerKg ?? 1) * 0.15;
    await logDisposal(item.name, item.category, 'expired');
    await logEvent('item_discarded', co2, { name: item.name });
    await remove(item.id);
    toast.show(`Discarded: ${item.name}`, 'error');
  }, [logDisposal, logEvent, remove, toast]);

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
            onPress={() => { hapticSelection(); setActiveSegment('pantry'); }}
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
            onPress={() => { hapticSelection(); setActiveSegment('grocery'); }}
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 20,
            paddingTop: 12,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
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
          )}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.bg, paddingTop: 16, paddingBottom: 8 }]}>
              <View style={[styles.sectionBullet, { backgroundColor: section.color }]} />
              <Text style={[type.h2, { color: section.textColor }]}>{section.title}</Text>
              <View style={[styles.sectionCountBadge, { backgroundColor: section.badgeBg }]}>
                <Text style={[type.monoBold, { color: section.textColor, fontSize: 10 }]}>{section.data.length}</Text>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <View>
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
                      onPress={() => { hapticSelection(); setSelectedCategory(cat); }}
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
            </View>
          }
          ListEmptyComponent={
            !loading && filteredItems.length === 0 ? (
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
            ) : null
          }
        />
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
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
                placeholder="Enter food name"
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
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PANTRY ITEM CARD COMPONENT
// ─────────────────────────────────────────────────────────────────


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
