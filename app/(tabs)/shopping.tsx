import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Plus,
  X,
  Check,
  Trash2,
  ShoppingBag,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
  EmptyState,
} from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { useShoppingList } from '@/lib/hooks';
import { searchGroceryItems } from '@/lib/ai';
import { CATEGORY_LABELS } from '@/lib/foodCatalog';

export function ShoppingView({ embedded = false }: { embedded?: boolean }) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { items, addItems, toggleCheck, remove, clearChecked } = useShoppingList();
  const [addModal, setAddModal] = useState(false);

  const unchecked = useMemo(() => items.filter((i) => !i.checked), [items]);
  const checked = useMemo(() => items.filter((i) => i.checked), [items]);

  const handleCheck = (id: string, val: boolean) => {
    Haptics.impactAsync(val ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    toggleCheck(id, val);
    if (val) {
      toast.show('Item moved to basket', 'success');
    }
  };

  const progressPct = items.length > 0 ? Math.round((checked.length / items.length) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 130,
          paddingTop: embedded ? 8 : insets.top + 8,
          paddingHorizontal: spacing[4],
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!embedded && (
          <AppHeader
            title="Grocery List"
            subtitle={
              unchecked.length > 0
                ? `${unchecked.length} items needed`
                : checked.length > 0
                ? 'All items acquired'
                : 'Pantry is fully stocked'
            }
            rightAction={
              <IconButton
                icon={<Plus size={20} color={palette.chalk} strokeWidth={2.5} />}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAddModal(true);
                }}
                accessibilityLabel="Add grocery item"
                size={40}
                style={{ backgroundColor: palette.forestDeep }}
              />
            }
          />
        )}

        {/* ── Progress Card ── */}
        {items.length > 0 && (
          <SurfaceCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={15} color={palette.forestDeep} strokeWidth={2.5} />
                <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.8 }]}>
                  BASKET PROGRESS
                </Text>
              </View>
              <Text style={[type.monoBold, { color: palette.forestDeep, fontSize: 13 }]}>
                {checked.length} / {items.length} ({progressPct}%)
              </Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPct}%`,
                    backgroundColor: progressPct === 100 ? palette.forestDeep : palette.forestDeep,
                  },
                ]}
              />
            </View>
          </SurfaceCard>
        )}

        {/* ── Empty State ── */}
        {items.length === 0 && (
          <EmptyState
            title="Shopping list is clear"
            description="Missing meal ingredients from your weekly plan and recipes appear here automatically. You can also add custom pantry staples."
            actionLabel="Add Grocery Item"
            onAction={() => setAddModal(true)}
            icon={<ShoppingBag size={34} color={palette.forestDeep} strokeWidth={2} />}
          />
        )}

        {/* ── To Buy Section ── */}
        {unchecked.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>To Purchase</Text>
              <StatusBadge label={`${unchecked.length} items`} variant="neutral" size="sm" />
            </View>

            <View style={{ gap: spacing[2] }}>
              {unchecked.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  id={item.id}
                  name={item.item_name}
                  category={item.category}
                  qty={item.quantity}
                  checked={false}
                  colors={colors}
                  onCheck={() => handleCheck(item.id, true)}
                  onDelete={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    remove(item.id);
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── In Basket Section ── */}
        {checked.length > 0 && (
          <View style={[styles.sectionWrap, { marginTop: spacing[5] }]}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color={palette.forestDeep} strokeWidth={2.5} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>In Basket</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  clearChecked();
                  toast.show('Cleared completed items', 'info');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearBtn}
              >
                <Text style={[styles.clearBtnText, { color: palette.burgundy }]}>
                  CLEAR COMPLETED
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: spacing[2] }}>
              {checked.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  id={item.id}
                  name={item.item_name}
                  category={item.category}
                  qty={item.quantity}
                  checked={true}
                  colors={colors}
                  onCheck={() => handleCheck(item.id, false)}
                  onDelete={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    remove(item.id);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Add Item Modal ── */}
      <AddShoppingModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onAdd={addItems}
      />
    </View>
  );
}

// ─── Single Grocery Item Row ────────────────────────────────────
interface ShoppingItemRowProps {
  id: string;
  name: string;
  category?: string;
  qty: number;
  checked: boolean;
  colors: any;
  onCheck: () => void;
  onDelete: () => void;
}

function ShoppingItemRow({
  name,
  category,
  qty,
  checked,
  colors,
  onCheck,
  onDelete,
}: ShoppingItemRowProps) {
  const categoryLabel = (category && (CATEGORY_LABELS as any)[category]) || category || 'Pantry';

  return (
    <SurfaceCard
      style={[
        styles.itemCard,
        checked && { opacity: 0.65, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.itemInnerRow}>
        {/* Checkbox Target with min 44x44 touch area */}
        <TouchableOpacity
          onPress={onCheck}
          style={styles.checkboxTouchable}
          activeOpacity={0.7}
          accessibilityLabel={`Mark ${name} as ${checked ? 'unbought' : 'bought'}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: checked ? palette.forestDeep : colors.border,
                backgroundColor: checked ? palette.forestDeep : 'transparent',
              },
            ]}
          >
            {checked && <Check size={14} color={palette.chalk} strokeWidth={3} />}
          </View>
        </TouchableOpacity>

        {/* Item Info */}
        <View style={{ flex: 1, paddingVertical: 2 }}>
          <Text
            style={[
              styles.itemNameText,
              {
                color: checked ? colors.subText : colors.text,
                textDecorationLine: checked ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.categorySubRow}>
            <Text style={[styles.categoryText, { color: colors.subText }]}>
              {categoryLabel}
            </Text>
            {qty > 1 && (
              <View style={[styles.qtyBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.qtyBadgeText, { color: colors.text }]}>×{qty}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delete button with 44x44 touch target */}
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteTouchable}
          accessibilityLabel={`Delete ${name}`}
          accessibilityRole="button"
        >
          <Trash2 size={16} color={palette.burgundy} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

// ─── Add Grocery Modal ───────────────────────────────────────────
interface AddShoppingModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: Array<{ item_name: string; category: string; quantity: number }>) => Promise<void>;
}

function AddShoppingModal({ visible, onClose, onAdd }: AddShoppingModalProps) {
  const { colors, mode } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; category: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchGroceryItems(text);
        setResults(res.items || []);
      } catch (e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const handlePick = async (name: string, category: string = 'other') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onAdd([{ item_name: name, category, quantity: 1 }]);
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Grocery Item</Text>
              <Text style={[styles.modalSub, { color: colors.subText }]}>
                Search pantry staples or custom ingredients
              </Text>
            </View>
            <IconButton
              icon={<X size={18} color={colors.text} strokeWidth={2.5} />}
              onPress={onClose}
              accessibilityLabel="Close modal"
              size={36}
            />
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchBarWrap,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <Search size={18} color={colors.subText} strokeWidth={2} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="e.g. Greek Yogurt, Oats, Kale..."
              placeholderTextColor={colors.subText}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.subText} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results / Quick add */}
          <View style={{ flex: 1, minHeight: 160, maxHeight: 260, marginTop: spacing[3] }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {results.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {results.map((item, idx) => (
                    <PressableScale
                      key={idx}
                      onPress={() => handlePick(item.name, item.category)}
                      style={[
                        styles.resultRow,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.resultCategory, { color: colors.subText }]}>
                          {(CATEGORY_LABELS as any)[item.category] || item.category}
                        </Text>
                      </View>
                      <Plus size={16} color={palette.forestDeep} strokeWidth={2.5} />
                    </PressableScale>
                  ))}
                </View>
              ) : query.trim().length >= 2 ? (
                <PressableScale
                  onPress={() => handlePick(query.trim(), 'other')}
                  style={[
                    styles.resultRow,
                    {
                      backgroundColor:
                        mode === 'dark' ? 'rgba(61, 107, 53, 0.2)' : 'rgba(61, 107, 53, 0.08)',
                      borderColor: palette.forestDeep,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: palette.forestDeep }]}>
                      Add &ldquo;{query.trim()}&rdquo;
                    </Text>
                    <Text style={[styles.resultCategory, { color: colors.subText }]}>
                      Custom grocery item
                    </Text>
                  </View>
                  <Plus size={16} color={palette.forestDeep} strokeWidth={2.5} />
                </PressableScale>
              ) : (
                <View style={styles.promptWrap}>
                  <Layers size={22} color={colors.subText} strokeWidth={1.8} />
                  <Text style={[styles.promptText, { color: colors.subText }]}>
                    Type to search grocery catalog or add custom item
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Quick Add Custom Button */}
          {query.trim().length > 0 && (
            <PrimaryAction
              label={`Add "${query.trim()}"`}
              onPress={() => handlePick(query.trim(), 'other')}
              icon={<Plus size={18} color={palette.chalk} strokeWidth={2.5} />}
              style={{ marginTop: spacing[3] }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressCard: {
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionWrap: {
    marginBottom: spacing[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: font.sansBold,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 11,
    fontFamily: font.monoBold,
    letterSpacing: 0.6,
  },
  itemCard: {
    padding: 0,
    marginBottom: 2,
  },
  itemInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  checkboxTouchable: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNameText: {
    fontSize: 15,
    fontFamily: font.sansBold,
  },
  categorySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: font.sans,
  },
  qtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontFamily: font.monoBold,
  },
  deleteTouchable: {
    width: 48,
    height: 56,
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
    maxHeight: '80%',
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultName: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  resultCategory: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 2,
  },
  promptWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    gap: 8,
  },
  promptText: {
    fontSize: 13,
    fontFamily: font.sans,
    textAlign: 'center',
  },
});

export default function ShoppingScreen() {
  return <ShoppingView />;
}
