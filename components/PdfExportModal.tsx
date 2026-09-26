import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  FileText,
  Share2,
  Printer,
  X,
  ShieldCheck,
  Leaf,
  Scale,
  Activity,
  Flame,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import { palette, font, type, spacing } from '@/lib/theme';
import { useTheme, SurfaceCard, PrimaryAction, SecondaryAction, useToast } from '@/components/ui';
import { HealthPdfData, shareHealthPdf, buildHealthReportHtml } from '@/lib/pdfExport';
import { Condition } from '@/lib/types';
import { hapticSuccess, hapticTap, hapticError } from '@/lib/haptics';

interface PdfExportModalProps {
  visible: boolean;
  onClose: () => void;
  data: HealthPdfData;
}

export function PdfExportModal({ visible, onClose, data }: PdfExportModalProps) {
  const { colors, mode } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      hapticTap();
      setLoading(true);
      await shareHealthPdf(data);
      hapticSuccess();
      toast.show('Report generated and ready to share!', 'success');
      onClose();
    } catch (err: any) {
      hapticError();
      toast.show(err.message || 'Failed to export PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      hapticTap();
      setLoading(true);
      const html = buildHealthReportHtml(data);
      await Print.printAsync({ html });
      hapticSuccess();
    } catch (err: any) {
      hapticError();
      toast.show(err.message || 'Print job canceled', 'info');
    } finally {
      setLoading(false);
    }
  };

  const isDark = mode === 'dark';
  const wasteDivertedKg = ((data.impact.mealsRescued || 0) * 0.4).toFixed(1);
  const co2PreventedKg = (data.impact.totalCo2eAvoided || 0).toFixed(1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? '#141210' : '#FFFFFF', borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconWrap, { backgroundColor: palette.forestDeep }]}>
                <FileText size={20} color={palette.amber} />
              </View>
              <View>
                <Text style={[type.h2, { color: colors.text }]}>Clinical & Waste PDF</Text>
                <Text style={[type.bodySm, { color: colors.subText }]}>Official export preview</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {/* Body Preview ScrollView */}
          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Impact Metric Strip */}
            <View style={styles.impactStrip}>
              <View style={styles.impactTile}>
                <Leaf size={16} color={palette.amber} />
                <Text style={styles.impactVal}>{data.impact.mealsRescued || 0}</Text>
                <Text style={styles.impactLabel}>Meals Rescued</Text>
              </View>
              <View style={styles.impactTile}>
                <Scale size={16} color={palette.amber} />
                <Text style={styles.impactVal}>{wasteDivertedKg} kg</Text>
                <Text style={styles.impactLabel}>Diverted</Text>
              </View>
              <View style={styles.impactTile}>
                <Flame size={16} color={palette.amber} />
                <Text style={styles.impactVal}>{co2PreventedKg} kg</Text>
                <Text style={styles.impactLabel}>CO2e Saved</Text>
              </View>
            </View>

            {/* Biometric & Clinical Card */}
            <SurfaceCard style={styles.previewSection} variant="outline">
              <View style={styles.sectionHeader}>
                <Activity size={16} color={palette.forestDeep} />
                <Text style={[type.label, { color: palette.forestDeep }]}>BIOMETRICS & CLINICAL PROFILE</Text>
              </View>
              <View style={styles.dataGrid}>
                <View style={styles.dataCol}>
                  <Text style={[type.labelSm, { color: colors.subText }]}>PATIENT</Text>
                  <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>
                    {data.profile.name || 'Anonymous User'}
                  </Text>
                </View>
                <View style={styles.dataCol}>
                  <Text style={[type.labelSm, { color: colors.subText }]}>BMI</Text>
                  <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>
                    {data.bmi.toFixed(1)} ({data.bmiCategory})
                  </Text>
                </View>
                <View style={styles.dataCol}>
                  <Text style={[type.labelSm, { color: colors.subText }]}>TDEE</Text>
                  <Text style={[type.body, { color: colors.text, fontFamily: font.sansBold }]}>
                    {Math.round(data.tdee)} kcal/day
                  </Text>
                </View>
              </View>

              {data.profile.conditions && data.profile.conditions.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[type.labelSm, { color: colors.subText, marginBottom: 4 }]}>CONDITIONS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {data.profile.conditions.map((c: Condition) => (
                      <View key={c} style={styles.conditionChip}>
                        <Text style={styles.conditionText}>{c.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SurfaceCard>

            {/* RDA Summary Card */}
            <SurfaceCard style={styles.previewSection} variant="outline">
              <View style={styles.sectionHeader}>
                <ShieldCheck size={16} color={palette.forestDeep} />
                <Text style={[type.label, { color: palette.forestDeep }]}>NUTRITIONAL RDA TARGETS</Text>
              </View>
              <View style={styles.nutrientRow}>
                <Text style={[type.bodySm, { color: colors.subText }]}>Daily Energy</Text>
                <Text style={[type.monoBold, { color: colors.text }]}>{Math.round(data.rda.kcal)} kcal</Text>
              </View>
              <View style={styles.nutrientRow}>
                <Text style={[type.bodySm, { color: colors.subText }]}>Protein Target</Text>
                <Text style={[type.monoBold, { color: colors.text }]}>{Math.round(data.rda.proteinG)} g</Text>
              </View>
              <View style={styles.nutrientRow}>
                <Text style={[type.bodySm, { color: colors.subText }]}>Carbohydrates</Text>
                <Text style={[type.monoBold, { color: colors.text }]}>{Math.round(data.rda.carbG)} g</Text>
              </View>
              <View style={styles.nutrientRow}>
                <Text style={[type.bodySm, { color: colors.subText }]}>Dietary Fiber</Text>
                <Text style={[type.monoBold, { color: colors.text }]}>{Math.round(data.rda.fiberG)} g</Text>
              </View>
              <View style={styles.nutrientRow}>
                <Text style={[type.bodySm, { color: colors.subText }]}>Sodium Upper Limit</Text>
                <Text style={[type.monoBold, { color: colors.text }]}>{Math.round(data.rda.sodium)} mg</Text>
              </View>
            </SurfaceCard>

            {/* Pantry Items summary */}
            <SurfaceCard style={styles.previewSection} variant="outline">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[type.label, { color: palette.forestDeep }]}>INVENTORY SNAPSHOT</Text>
                <Text style={[type.labelSm, { color: colors.subText }]}>
                  {data.inventory?.length || 0} active records included
                </Text>
              </View>
            </SurfaceCard>

            {/* Disclaimer */}
            <Text style={[type.bodySm, { color: colors.subText, marginVertical: 14, fontSize: 11, lineHeight: 16 }]}>
              Generates an A4 publication-quality PDF formatted with medical dietary standards and ecological
              savings data.
            </Text>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <SecondaryAction
                label="Direct Print"
                icon={Printer}
                onPress={handlePrint}
                disabled={loading}
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <PrimaryAction
                label={loading ? 'Generating...' : 'Export & Share PDF'}
                icon={loading ? ActivityIndicator : Share2}
                onPress={handleShare}
                variant="sage"
                disabled={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  impactStrip: {
    flexDirection: 'row',
    backgroundColor: palette.forestDeep,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  impactTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactVal: {
    fontFamily: font.monoBold,
    fontSize: 16,
    color: palette.amber,
    marginTop: 4,
  },
  impactLabel: {
    fontFamily: font.sansBold,
    fontSize: 9,
    color: palette.chalk,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    opacity: 0.85,
  },
  previewSection: {
    padding: spacing[3],
    borderRadius: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataCol: {
    flex: 1,
  },
  conditionChip: {
    backgroundColor: palette.crimsonMist,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  conditionText: {
    fontFamily: font.monoBold,
    fontSize: 10,
    color: palette.crimson,
    letterSpacing: 0.4,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
