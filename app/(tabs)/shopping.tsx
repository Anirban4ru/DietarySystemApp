import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { Plus, X, Check, Trash2, ShoppingCart } from 'lucide-react-native';
import { palette, type, spacing, font, border } from '@/lib/theme';
import { BrutalButton, BrutalPanel, Label, SectionHeader, useTheme } from '@/components/ui';
import { useShoppingList } from '@/lib/hooks';
import { FOOD_CATALOG, CATEGORY_LABELS } from '@/lib/foodCatalog';

export default function ShoppingScreen() {
  const { colors } = useTheme();
  const { items, addItems, toggleCheck, remove, clearChecked } = useShoppingList();
  const [addModal, setAddModal] = useState(false);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[type.display, { color: colors.text }]}>Shopping</Text>
        <Text style={[type.body, { color: colors.subText }]}>{unchecked.length} items to buy</Text>
      </View>

      {items.length === 0 && (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <ShoppingCart size={32} color={palette.sageDeep} strokeWidth={2.5} />
          <Text style={[type.h2, { marginTop: spacing[3], color: colors.text }]}>Nothing to buy yet</Text>
          <Text style={[type.bodySm, { color: colors.subText, marginTop: spacing[2] }]}>
            When a recipe has missing ingredients, they show up here. You can also add items yourself.
          </Text>
        </View>
      )}

      {unchecked.length > 0 && (
        <View style={{ marginBottom: spacing[4] }}>
          <Text style={[type.h2, { color: colors.text, marginBottom: spacing[2] }]}>To Buy</Text>
          {unchecked.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity style={[styles.checkBox, { borderColor: palette.ink }]} onPress={() => toggleCheck(item.id, true)}>
                <View style={{ width: 16, height: 16 }} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>{item.item_name}</Text>
                <Text style={[type.bodySm, { color: colors.subText }]}>x{item.quantity}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                <Trash2 size={14} color={palette.crimson} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {checked.length > 0 && (
        <View style={{ marginBottom: spacing[4] }}>
          <Text style={[type.h2, { color: colors.text, marginBottom: spacing[2] }]}>Got It</Text>
          {checked.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.6 }]}>
              <TouchableOpacity style={[styles.checkBox, styles.checkBoxDone, { borderColor: palette.sageDeep }]} onPress={() => toggleCheck(item.id, false)}>
                <Check size={14} color={palette.chalk} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.subText, textDecorationLine: 'line-through' }]}>{item.item_name}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                <Trash2 size={14} color={palette.crimson} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
          <BrutalButton variant="light" onPress={clearChecked} style={{ marginTop: spacing[2] }}>CLEAR CHECKED</BrutalButton>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)}>
        <Plus size={24} color={palette.chalk} strokeWidth={2.5} />
      </TouchableOpacity>

      <AddShoppingModal visible={addModal} onClose={() => setAddModal(false)} onAdd={addItems} />
    </ScrollView>
  );
}

function AddShoppingModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: any }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = FOOD_CATALOG.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);

  const pick = async (name: string) => {
    const food = FOOD_CATALOG.find((f) => f.name === name);
    await onAdd([{ item_name: name, category: food?.category ?? 'other', quantity: 1 }]);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BrutalPanel style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text }]}>Add item</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.subText} strokeWidth={2.5} /></TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Search food..."
            placeholderTextColor={colors.subText}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            {filtered.map((f) => (
              <TouchableOpacity key={f.name} style={[styles.suggestRow, { borderBottomColor: colors.border }]} onPress={() => pick(f.name)}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: colors.text }]}>{f.name}</Text>
                  <Text style={[type.bodySm, { color: colors.subText }]}>{CATEGORY_LABELS[f.category]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BrutalPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing[4] },
  header: { marginBottom: spacing[4] },
  empty: { alignItems: 'center', padding: spacing[8], borderWidth: border.thick },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderWidth: border.thick, padding: spacing[3], marginBottom: 4, gap: 12 },
  checkBox: { width: 20, height: 20, borderWidth: border.thick, alignItems: 'center', justifyContent: 'center' },
  checkBoxDone: { backgroundColor: palette.sageDeep },
  delBtn: { padding: 4 },
  fab: { position: 'absolute', right: spacing[4], bottom: spacing[6], width: 56, height: 56, borderWidth: border.thick, borderColor: palette.chalk, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,10,10,0.6)' },
  modalPanel: { maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  input: { borderWidth: border.thick, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontFamily: font.sans, fontSize: 15, marginBottom: spacing[3] },
  suggestRow: { paddingVertical: spacing[3], borderBottomWidth: border.thin },
});
