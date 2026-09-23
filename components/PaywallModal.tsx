import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  Dimensions, Switch, ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Crown, Sparkles, Check, X, ShieldCheck, Zap,
  Lock, RefreshCw, AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, SurfaceCard, PrimaryAction, SecondaryAction, useToast } from '@/components/ui';
import { usePro, ProEntitlement } from '@/lib/hooks';

const { width: SCREEN_W } = Dimensions.get('window');

const FEATURE_DESCRIPTIONS: Record<ProEntitlement, { name: string; desc: string; preview: string }> = {
  unlimited_scans: {
    name: 'Unlimited AI Scans',
    desc: 'Scan pantry items, barcodes, and groceries without limits.',
    preview: 'Real-time multi-angle computer vision classification active',
  },
  advanced_receipt_processing: {
    name: 'Advanced Receipt Scanning',
    desc: 'Parse complex grocery store receipts into individual pantry items automatically.',
    preview: 'Multi-item line-item breakdown with instant expiry mapping',
  },
  macro_targets: {
    name: 'Clinical Macro & Micronutrient Engine',
    desc: 'Track daily Protein, Carbs, Fats, Fiber, and micronutrients customized to your metabolic profile.',
    preview: 'Daily RDA calculation, real-time deficit alerts & macro budgets',
  },
  smart_substitutions: {
    name: 'Smart Pantry Ingredient Substitutions',
    desc: 'Substitute missing recipe ingredients with items already inside your pantry.',
    preview: 'Dynamic swap suggestions save $40+ per week in unnecessary grocery trips',
  },
  household_pantry: {
    name: 'Household & Shared Pantry Sync',
    desc: 'Keep your entire family or roommates in sync with real-time updates.',
    preview: 'Instant synchronization across devices with shared shopping list',
  },
  advanced_impact_analytics: {
    name: 'Advanced Environmental Analytics',
    desc: 'Track lifetime carbon avoidance, methane reduction curves, and annual dollar savings.',
    preview: 'Monthly and yearly trajectory forecasting with milestone reporting',
  },
  waste_pattern_insights: {
    name: 'Predictive Waste Pattern Insights',
    desc: 'AI predicts which foods spoil fastest in your fridge and schedules rescue recipes.',
    preview: 'Spanned degradation timeline with preventative alerts',
  },
  clinical_meal_plans: {
    name: 'Personalized Clinical Meal Plans',
    desc: 'AI-generated weekly meal plans based on your medical conditions, preferences, and expiring pantry.',
    preview: 'Condition-safe recipes (diabetes, celiac, hypertension, lactose)',
  },
};

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
  feature?: ProEntitlement | null;
}

export function PaywallModal({
  visible: controlledVisible,
  onClose: controlledOnClose,
  feature: targetFeature,
}: PaywallModalProps) {
  const { colors, mode } = useTheme();
  const {
    isPro,
    unlockPro,
    activeFeaturePaywall,
    closePaywall,
  } = usePro();
  const toast = useToast();

  const isVisible = controlledVisible !== undefined ? controlledVisible : Boolean(activeFeaturePaywall);
  const handleClose = controlledOnClose ?? closePaywall;
  const currentFeature = targetFeature ?? activeFeaturePaywall;

  const [state, setState] = useState<'idle' | 'purchasing' | 'restoring' | 'success' | 'error'>('idle');
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [enableTrial, setEnableTrial] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isVisible) return null;

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('purchasing');
    setErrorMessage(null);

    try {
      // Simulate real subscription transaction
      await new Promise((res) => setTimeout(res, 1400));
      await unlockPro(selectedPlan);
      setState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Welcome to Nourish+ Pro! All features unlocked.', 'success');
      setTimeout(() => {
        setState('idle');
        handleClose();
      }, 900);
    } catch (e: any) {
      setState('error');
      setErrorMessage(e.message || 'Subscription processing failed. Please check your connection.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('restoring');
    setErrorMessage(null);

    try {
      await new Promise((res) => setTimeout(res, 1200));
      await unlockPro('annual');
      setState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Purchases successfully restored.', 'success');
      setTimeout(() => {
        setState('idle');
        handleClose();
      }, 900);
    } catch (e: any) {
      setState('error');
      setErrorMessage(e.message || 'No prior purchases found to restore.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isDark = mode === 'dark';
  const featureContext = currentFeature ? FEATURE_DESCRIPTIONS[currentFeature] : null;

  return (
    <Modal transparent animationType="slide" visible={isVisible}>
      <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <View style={styles.container}>
          {/* Top Close Button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Crown Header Icon */}
            <View style={[styles.iconWrap, { borderColor: palette.amber + '60' }]}>
              <Crown size={38} color={palette.amberDeep} strokeWidth={2.2} />
            </View>

            <View style={styles.tagWrap}>
              <Sparkles size={12} color={palette.amberDeep} />
              <Text style={styles.tagText}>INTELLIGENT KITCHEN COMPANION</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Nourish<Text style={{ color: palette.amberDeep }}>+</Text> Pro
            </Text>
            <Text style={[styles.heroSub, { color: colors.subText }]}>
              Elevate your kitchen with clinical nutrition intelligence, smart ingredient substitutions, and automated waste prevention.
            </Text>

            {/* Targeted Feature Spotlight if opened from a specific gate */}
            {featureContext && (
              <SurfaceCard style={styles.spotlightCard} variant="paper">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Lock size={14} color={palette.amberDeep} />
                  <Text style={[type.monoBold, { color: palette.amberDeep, fontSize: 11 }]}>
                    UNLOCKING THIS FEATURE
                  </Text>
                </View>
                <Text style={[type.h3, { color: colors.text, fontFamily: font.sansBold }]}>
                  {featureContext.name}
                </Text>
                <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>
                  {featureContext.desc}
                </Text>
                <View style={[styles.previewPill, { backgroundColor: colors.surface }]}>
                  <Check size={12} color={palette.sageDeep} strokeWidth={2.5} />
                  <Text style={[type.mono, { color: colors.text, fontSize: 10, flex: 1 }]}>
                    {featureContext.preview}
                  </Text>
                </View>
              </SurfaceCard>
            )}

            {/* Plan Selector */}
            <View style={styles.planSelectorRow}>
              {/* Annual Plan */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: selectedPlan === 'annual' ? (isDark ? '#232D1E' : '#F2FAF4') : colors.surface,
                    borderColor: selectedPlan === 'annual' ? palette.amber : colors.border,
                    borderWidth: selectedPlan === 'annual' ? 2 : 1.5,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setSelectedPlan('annual'); }}
                accessibilityRole="radio"
                accessibilityLabel="Annual plan: Rs 167 per month, billed Rs 1999 per year"
                accessibilityState={{ selected: selectedPlan === 'annual' }}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueBadgeText}>SAVE 50% • BEST VALUE</Text>
                </View>
                <Text style={[styles.planPeriod, { color: colors.text }]}>Annual</Text>
                <Text style={[styles.planPrice, { color: palette.amberDeep }]}>
                  {'₹'}167 <Text style={styles.planPerMo}>/ mo</Text>
                </Text>
                <Text style={[styles.planBilled, { color: colors.subText }]}>Billed {'₹'}1,999/yr</Text>
              </TouchableOpacity>

              {/* Monthly Plan */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: selectedPlan === 'monthly' ? (isDark ? '#232D1E' : '#F2FAF4') : colors.surface,
                    borderColor: selectedPlan === 'monthly' ? palette.amber : colors.border,
                    borderWidth: selectedPlan === 'monthly' ? 2 : 1.5,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setSelectedPlan('monthly'); }}
                accessibilityRole="radio"
                accessibilityLabel="Monthly plan: Rs 299 per month, cancel anytime"
                accessibilityState={{ selected: selectedPlan === 'monthly' }}
              >
                <Text style={[styles.planPeriod, { color: colors.text, marginTop: 14 }]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>
                  {'₹'}299 <Text style={styles.planPerMo}>/ mo</Text>
                </Text>
                <Text style={[styles.planBilled, { color: colors.subText }]}>Billed monthly</Text>
              </TouchableOpacity>
            </View>

            {/* Trial Toggle */}
            <View style={[styles.trialRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialTitle, { color: colors.text }]}>7-Day Free Trial Included</Text>
                <Text style={[styles.trialSub, { color: colors.subText }]}>No charge today. Cancel anytime before day 7.</Text>
              </View>
              <Switch
                value={enableTrial}
                onValueChange={(val) => { Haptics.selectionAsync(); setEnableTrial(val); }}
                trackColor={{ false: colors.border, true: palette.sageDeep }}
                thumbColor={palette.chalk}
              />
            </View>

            {/* Features Included List */}
            <SurfaceCard style={{ marginVertical: spacing[3], padding: spacing[4] }} variant="subtle">
              <Text style={[type.label, { color: colors.subText, marginBottom: spacing[3] }]}>
                ALL PRO CAPABILITIES INCLUDED
              </Text>
              {[
                'Unlimited AI Food & Barcode Scans',
                'Multi-item Smart Receipt Digitizer',
                'Personalized Macro & Micronutrient Engine',
                'Pantry-aware Ingredient Substitutions',
                'Predictive Freshness & Expiry Curves',
                'Detailed Carbon & Financial Impact Reports',
              ].map((feat, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: palette.sageMist, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color={palette.sageDeep} strokeWidth={2.5} />
                  </View>
                  <Text style={[type.bodySm, { color: colors.text, flex: 1 }]}>{feat}</Text>
                </View>
              ))}
            </SurfaceCard>

            {/* Error Message if any */}
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: palette.crimsonMist }]}>
                <AlertCircle size={16} color={palette.crimson} />
                <Text style={[type.bodySm, { color: palette.crimson, flex: 1 }]}>{errorMessage}</Text>
              </View>
            )}

            {/* CTAs */}
            <View style={{ marginTop: spacing[4], gap: 10 }}>
              <PrimaryAction
                label={
                  state === 'purchasing' ? 'Securing Access...' :
                  enableTrial ? 'Start 7-Day Free Trial' :
                  `Subscribe for ${selectedPlan === 'annual' ? '\u20b91,999/yr' : '\u20b9299/mo'}`
                }
                onPress={handleUpgrade}
                loading={state === 'purchasing'}
                variant="sage"
                icon={Sparkles}
              />

              <TouchableOpacity
                onPress={handleRestore}
                disabled={state === 'restoring' || state === 'purchasing'}
                style={{ paddingVertical: 10, alignItems: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Restore previous purchases"
              >
                {state === 'restoring' ? (
                  <ActivityIndicator size="small" color={colors.subText} />
                ) : (
                  <Text style={[type.monoBold, { color: colors.subText, fontSize: 11 }]}>
                    RESTORE PURCHASES
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Legal & Renewal Terms */}
            <Text style={[styles.termsText, { color: colors.subText }]}>
              {enableTrial
                ? 'After 7 days, your subscription renews automatically at the selected price unless cancelled 24 hours before trial ends. '
                : 'Your subscription renews automatically unless cancelled 24 hours before the end of the current period. '}
              Payment charged via Google Play or App Store. Made in India with love. Cancel anytime in settings.
            </Text>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: 12,
    marginBottom: 14,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 9,
    fontFamily: font.sansBold,
    color: palette.amberDeep,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  spotlightCard: {
    width: '100%',
    padding: spacing[4],
    borderRadius: 16,
    marginBottom: spacing[4],
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minHeight: 110,
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: palette.amberDeep,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestValueBadgeText: {
    color: palette.chalk,
    fontSize: 8,
    fontFamily: font.sansBold,
    letterSpacing: 0.5,
  },
  planPeriod: {
    fontFamily: font.sansBold,
    fontSize: 13,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  planPerMo: {
    fontFamily: font.sans,
    fontSize: 11,
  },
  planBilled: {
    fontFamily: font.sans,
    fontSize: 10,
    marginTop: 4,
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  trialTitle: {
    fontFamily: font.sansBold,
    fontSize: 13,
  },
  trialSub: {
    fontFamily: font.sans,
    fontSize: 11,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    width: '100%',
  },
  termsText: {
    fontFamily: font.sans,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 320,
    opacity: 0.7,
  },
});
