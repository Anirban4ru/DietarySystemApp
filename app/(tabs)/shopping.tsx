import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { Plus, X, Check, Trash2, ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { BrutalButton, PressScale, useTheme, useToast, Loader } from '@/components/ui';
import { useShoppingList } from '@/lib/hooks';
import { searchGroceryItems } from '@/lib/ai';
import { FOOD_CATALOG, CATEGORY_LABELS } from '@/lib/foodCatalog';

export default function ShoppingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { items, addItems, toggleCheck, remove, clearChecked } = useShoppingList();
  const [addModal, setAddModal] = useState(false);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const handleCheck = (id: string, val: boolean) => {
    Haptics.impactAsync(val ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    toggleCheck(id, val);
    if (val) toast.show('Got it! ✓', 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 8, paddingHorizontal: spacing[4] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Shopping</Text>
            <Text style={[styles.screenSub, { color: colors.subText }]}>
              {unchecked.length > 0 ? `${unchecked.length} items to buy` : checked.length > 0 ? 'All done! 🎉' : 'Nothing here yet'}
            </Text>
          </View>
          <View style={[styles.bagIcon, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <ShoppingBag size={20} color={palette.sageDeep} strokeWidth={2.5} />
          </View>
        </View>

        {/* Progress bar when list has items */}
        {items.length > 0 && (
          <View style={[styles.progressWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.progressTextRow}>
              <Text style={[type.bodySm, { color: colors.subText, fontFamily: font.sansBold }]}>
                {checked.length} / {items.length} bought
              </Text>
              <Text style={[type.monoBold, { color: palette.sageDeep }]}>
                {Math.round((checked.length / items.length) * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${(checked.length / items.length) * 100}%` as any,
                backgroundColor: checked.length === items.length ? palette.sageDeep : palette.sageDeep,
              }]} />
            </View>
          </View>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 48, marginBottom: spacing[3] }}>🛒</Text>
            <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>Nothing to buy</Text>
            <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2], textAlign: 'center' }]}>
              Missing recipe ingredients appear here automatically. You can also add items manually.
            </Text>
            <BrutalButton variant="sage" onPress={() => setAddModal(true)} style={{ marginTop: spacing[4] }}>
              <Plus size={16} color={palette.chalk} strokeWidth={2.5} />
              <Text style={[type.label, { color: palette.chalk }]}>ADD ITEM</Text>
            </BrutalButton>
          </View>
        )}

        {/* To buy */}
        {unchecked.length > 0 && (
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>To Buy</Text>
            {unchecked.map((item) => (
              <ShoppingItem
                key={item.id}
                name={item.item_name}
                qty={item.quantity}
                checked={false}
                colors={colors}
                onCheck={() => handleCheck(item.id, true)}
                onDelete={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); remove(item.id); }}
              />
            ))}
          </View>
        )}

        {/* Got it */}
        {checked.length > 0 && (
          <View style={{ marginBottom: spacing[4] }}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>In Basket</Text>
              <PressScale onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); clearChecked(); }}>
                <View style={[styles.clearBtn, { borderColor: colors.border }]}>
                  <Text style={[type.monoBold, { color: palette.danger, fontSize: 10 }]}>CLEAR</Text>
                </View>
              </PressScale>
            </View>
            {checked.map((item) => (
              <ShoppingItem
                key={item.id}
                name={item.item_name}
                qty={item.quantity}
                checked
                colors={colors}
                onCheck={() => handleCheck(item.id, false)}
                onDelete={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); remove(item.id); }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <PressScale
        onPress={() => setAddModal(true)}
        style={[styles.fab, { bottom: insets.bottom + spacing[6] }]}
      >
        <View style={[styles.fabInner, { backgroundColor: palette.ink }]}>
          <Plus size={26} color={palette.chalk} strokeWidth={2.5} />
        </View>
      </PressScale>

      <AddShoppingModal visible={addModal} onClose={() => setAddModal(false)} onAdd={addItems} />
    </View>
  );
}

// ─── Shopping Item with animated checkbox ────────────────────────
function ShoppingItem({ name, qty, checked, colors, onCheck, onDelete }: {
  name: string; qty: number; checked: boolean; colors: any;
  onCheck: () => void; onDelete: () => void;
}) {
  const checkAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  const toggle = () => {
    Animated.spring(checkAnim, {
      toValue: checked ? 0 : 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
    onCheck();
  };

  const scale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <View style={[
      styles.itemRow,
      {
        borderColor: checked ? colors.border : colors.border,
        backgroundColor: checked ? colors.surface : colors.bg,
        opacity: checked ? 0.65 : 1,
      },
    ]}>
      <TouchableOpacity onPress={toggle} style={styles.checkArea}>
        <Animated.View style={[
          styles.checkBox,
          {
            borderColor: checked ? palette.sageDeep : colors.border,
            backgroundColor: checked ? palette.sageDeep : 'transparent',
            transform: [{ scale }],
          },
        ]}>
          {checked && <Check size={12} color={palette.chalk} strokeWidth={3} />}
        </Animated.View>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[
          styles.itemName,
          {
            color: checked ? colors.subText : colors.text,
            textDecorationLine: checked ? 'line-through' : 'none',
          },
        ]}>
          {name}
        </Text>
        {qty > 1 && <Text style={[type.bodySm, { color: colors.subText }]}>×{qty}</Text>}
      </View>

      <PressScale onPress={onDelete}>
        <View style={styles.deleteArea}>
          <Trash2 size={15} color={palette.crimson} strokeWidth={2.5} />
        </View>
      </PressScale>
    </View>
  );
}

// ─── Add Modal ───────────────────────────────────────────────────
function AddShoppingModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: any }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; category: string; emoji?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (text.length < 2) {
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
    }, 600);
  };

  const pick = async (name: string, category: string = 'other') => {
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
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add Item</Text>
            <PressScale onPress={onClose}>
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>
          
          <TextInput
            style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Search any food item with AI..."
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />

          <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {searching ? (
              <View style={{ padding: spacing[4], alignItems: 'center' }}>
                <Loader />
              </View>
            ) : results.length > 0 ? (
              results.map((f, idx) => (
                <PressScale key={idx} onPress={() => pick(f.name, f.category)}>
                  <View style={[styles.suggestRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>{f.emoji || '🛒'}</Text>
                      <View>
                        <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>{f.name}</Text>
                        <Text style={[type.bodySm, { color: colors.subText }]}>{f.category}</Text>
                      </View>
                    </View>
                    <Plus size={16} color={colors.subText} strokeWidth={2.5} />
                  </View>
                </PressScale>
              ))
            ) : query.length > 2 ? (
              <PressScale onPress={() => pick(query, 'other')}>
                 <View style={[styles.suggestRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>Add "{query}"</Text>
                      <Text style={[type.bodySm, { color: colors.subText }]}>Custom item</Text>
                    </View>
                    <Plus size={16} color={colors.subText} strokeWidth={2.5} />
                  </View>
              </PressScale>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  screenTitle:    { fontSize: 28, fontFamily: font.sansBold, letterSpacing: -0.5 },
  screenSub:      { fontSize: 13, fontFamily: font.sans, marginTop: 2 },
  bagIcon:        { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  progressWrap:   { borderWidth: 1.5, borderRadius: 14, padding: spacing[4], marginBottom: spacing[4] },
  progressTextRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTrack:  { height: 8, borderRadius: 4, backgroundColor: palette.hair, overflow: 'hidden' },
  progressFill:   { height: 8, borderRadius: 4 },
  emptyBox:       { alignItems: 'center', padding: spacing[8], borderWidth: 1.5, borderRadius: 20, marginTop: spacing[2] },
  sectionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  sectionLabel:   { fontSize: 16, fontFamily: font.sansBold, marginBottom: spacing[2] },
  clearBtn:       { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  itemRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: spacing[3], marginBottom: 8, gap: 12 },
  checkArea:      { padding: 4 },
  checkBox:       { width: 22, height: 22, borderWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  itemName:       { fontSize: 15, fontFamily: font.sansBold },
  deleteArea:     { padding: 8 },
  fab:            { position: 'absolute', right: spacing[5] } as any,
  fabInner:       { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: palette.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing[5], paddingBottom: 40, paddingTop: 12 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.mist2, alignSelf: 'center', marginBottom: spacing[4] },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  searchInput:    { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.sans, fontSize: 15, marginBottom: spacing[3] },
  suggestRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1 },
});
