import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { ChefHat, ShoppingCart, X } from 'lucide-react-native';
import { palette, type, spacing, font } from '@/lib/theme';
import { PressScale, Label, Pill, Divider, BrutalButton, useToast } from '@/components/ui';
import { RecipeCandidate } from '@/lib/optimizer';
import { co2eAvoidedForMeal } from '@/lib/impact';
import { getPairings } from '@/lib/features';
import { saveRecipeToVault, removeRecipeFromVault } from '@/lib/vault';

interface RecipeDetailProps {
  c: RecipeCandidate | null;
  onClose: () => void;
  onCook: (c: RecipeCandidate) => void;
  onShop: (c: RecipeCandidate) => void;
  colors: any;
}

export function RecipeDetail({ c, onClose, onCook, onShop, colors }: RecipeDetailProps) {
  const toast = useToast();
  if (!c) return null;
  const pairings = c.ingredients.length > 0 ? getPairings(c.ingredients[0].name) : [];

  return (
    <Modal visible={!!c} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={[type.h1, { color: colors.text, flex: 1, marginRight: 12 }]} numberOfLines={2}>{c.name}</Text>
            <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Close recipe details">
              <View style={[styles.closeBtn, { borderColor: colors.border }]}>
                <X size={18} color={colors.subText} strokeWidth={2.5} />
              </View>
            </PressScale>
          </View>

          <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {/* Ingredients */}
            <Label>INGREDIENTS</Label>
            <View style={{ marginTop: spacing[2] }}>
              {c.ingredients.map((ing) => {
                const missing = c.missing.includes(ing.name);
                const subbed = c.substitutions.find((s) => s.to === ing.name);
                return (
                  <View key={ing.name} style={[styles.ingRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.ingDot, { backgroundColor: missing ? palette.danger : palette.sageDeep }]} />
                    <Text style={[styles.ingName, { color: missing ? palette.danger : colors.text }]}>
                      {ing.name}
                    </Text>
                    <Text style={[styles.ingGrams, { color: colors.subText }]}>{ing.grams}g</Text>
                    {missing && <Pill tone="danger">NEED</Pill>}
                    {subbed && <Pill tone="warning">SWAPPED</Pill>}
                  </View>
                );
              })}
            </View>

            {/* Instructions (if AI-generated) */}
            {(c as any).instructions && (c as any).instructions.length > 0 && (
              <View style={{ marginTop: spacing[4] }}>
                <Label>HOW TO COOK</Label>
                {(c as any).instructions.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: palette.ink }]}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            <Divider color={colors.border} />

            {/* Nutrition */}
            <Label>NUTRITION</Label>
            <View style={styles.nutriGrid}>
              <NutriBox label="Calories" value={Math.round(c.nutrition.kcal)} colors={colors} />
              <NutriBox label="Protein" value={`${Math.round(c.nutrition.proteinG)}g`} colors={colors} />
              <NutriBox label="Carbs" value={`${Math.round(c.nutrition.carbG)}g`} colors={colors} />
              <NutriBox label="Fat" value={`${Math.round(c.nutrition.fatG)}g`} colors={colors} />
              <NutriBox label="Fiber" value={`${Math.round(c.nutrition.fiberG)}g`} colors={colors} />
              <NutriBox label="Iron" value={`${Math.round(c.nutrition.iron)}mg`} colors={colors} />
            </View>

            {pairings.length > 0 && (
              <View style={{ marginTop: spacing[4] }}>
                <Label>PAIRS WELL WITH</Label>
                <View style={styles.pairingRow}>
                  {pairings.map((p) => (
                    <View key={p} style={[styles.pairingChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Text style={[type.bodySm, { color: colors.text }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing[4] }}>
              <Label>ENVIRONMENTAL IMPACT</Label>
              <Text style={[type.h2, { color: palette.sageDeep, marginTop: 4 }]}>
                {co2eAvoidedForMeal(c.co2eKg)} kg CO2 saved
              </Text>
            </View>

            <View style={{ marginTop: spacing[6], gap: 8 }}>
              <BrutalButton variant="sage" onPress={async () => {
                await saveRecipeToVault(c);
                toast.show('Saved to Offline Vault 💾', 'success');
              }}>
                <Text style={[type.label, { color: palette.chalk }]}>SAVE TO VAULT</Text>
              </BrutalButton>
              <BrutalButton variant="outline" onPress={async () => {
                await removeRecipeFromVault(c.name);
                toast.show('Removed from Vault', 'info');
              }}>
                <Text style={[type.label, { color: colors.text }]}>REMOVE FROM VAULT</Text>
              </BrutalButton>
            </View>

            <View style={{ height: spacing[4] }} />
          </ScrollView>

          {/* Modal action buttons */}
          <View style={styles.modalBtnRow}>
            <PressScale onPress={() => { onCook(c); onClose(); }} style={{ flex: 1 }}>
              <View style={[styles.actionBtn, { backgroundColor: palette.ink }]}>
                <ChefHat size={15} color={palette.chalk} strokeWidth={2.5} />
                <Text style={styles.actionBtnText}>COOK & LOG</Text>
              </View>
            </PressScale>
            {c.missing.length > 0 && (
              <PressScale onPress={() => { onShop(c); onClose(); }} style={{ flex: 1, marginLeft: 8 }}>
                <View style={[styles.actionBtn, { backgroundColor: palette.sageDeep }]}>
                  <ShoppingCart size={15} color={palette.chalk} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText}>SHOP MISSING</Text>
                </View>
              </PressScale>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NutriBox({ label, value, colors }: { label: string; value: any; colors: any }) {
  return (
    <View style={[styles.nutriBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.nutriVal, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.nutriLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.mist2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingName: {
    flex: 1,
    fontSize: 15,
    fontFamily: font.sansBold,
  },
  ingGrams: {
    fontSize: 13,
    fontFamily: font.sans,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing[3],
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    color: palette.chalk,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: font.sans,
    lineHeight: 20,
  },
  nutriGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing[2],
  },
  nutriBox: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    alignItems: 'center',
  },
  nutriVal: {
    fontSize: 17,
    fontFamily: font.sansBold,
  },
  nutriLabel: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 2,
  },
  pairingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing[2],
  },
  pairingChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: font.sansBold,
    color: palette.chalk,
    letterSpacing: 0.5,
  },
});
