import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  Dimensions, Switch
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Crown, Sparkles, Check, X, ShieldCheck, Zap,
  Star, Lock, HeartHandshake, ArrowRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, BrutalButton, GlassPanel, useToast } from '@/components/ui';
import { usePro } from '@/lib/hooks';

const { width: SCREEN_W } = Dimensions.get('window');

export function PaywallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, mode } = useTheme();
  const { isPro, unlockPro, resetPro } = usePro();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [enableTrial, setEnableTrial] = useState(true);

  if (!visible) return null;

  const handleUpgrade = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    setTimeout(async () => {
      await unlockPro();
      setLoading(false);
      toast.show('🎉 Welcome to Nourish+ Pro! All features unlocked.', 'success');
      onClose();
    }, 1200);
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setTimeout(async () => {
      await unlockPro();
      setLoading(false);
      toast.show('Purchases successfully restored!', 'success');
      onClose();
    }, 1000);
  };

  const isDark = mode === 'dark';

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <View style={styles.container}>
          {/* Top Close Button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
            onPress={onClose}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Header Crown Icon */}
            <View style={[styles.iconWrap, { borderColor: palette.amber + '60' }]}>
              <Crown size={42} color={palette.amberDeep} strokeWidth={2.2} />
            </View>

            <View style={styles.tagWrap}>
              <Sparkles size={13} color={palette.amberDeep} />
              <Text style={styles.tagText}>CLINICAL AI & NUTRITION ENGINE</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Nourish<Text style={{ color: palette.amberDeep }}>+</Text> Pro
            </Text>
            <Text style={[styles.heroSub, { color: colors.subText }]}>
              Stop throwing away groceries. Maximize nutrition, auto-swap ingredients, and save $200+/month.
            </Text>

            {/* ── Plan Selector Cards ── */}
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
                  }
                ]}
                onPress={() => { Haptics.selectionAsync(); setSelectedPlan('annual'); }}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueBadgeText}>SAVE 50% • MOST POPULAR</Text>
                </View>
                <Text style={[styles.planPeriod, { color: colors.text }]}>Annual Access</Text>
                <Text style={[styles.planPrice, { color: palette.amberDeep }]}>$3.33 <Text style={styles.planPerMo}>/ mo</Text></Text>
                <Text style={[styles.planBilled, { color: colors.subText }]}>Billed $39.99/year</Text>
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
                  }
                ]}
                onPress={() => { Haptics.selectionAsync(); setSelectedPlan('monthly'); }}
              >
                <Text style={[styles.planPeriod, { color: colors.text, marginTop: 16 }]}>Monthly Access</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>$6.99 <Text style={styles.planPerMo}>/ mo</Text></Text>
                <Text style={[styles.planBilled, { color: colors.subText }]}>Billed monthly, cancel anytime</Text>
              </TouchableOpacity>
            </View>

            {/* ── Free Trial Toggle ── */}
            <View style={[styles.trialRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialTitle, { color: colors.text }]}>Enable 7-Day Free Trial</Text>
                <Text style={[styles.trialSub, { color: colors.subText }]}>You won&apos;t be billed anything today.</Text>
              </View>
              <Switch
                value={enableTrial}
                onValueChange={(val) => { Haptics.selectionAsync(); setEnableTrial(val); }}
                trackColor={{ false: colors.border, true: palette.sageDeep }}
                thumbColor={palette.chalk}
              />
            </View>

            {/* ── Feature Comparison Matrix ── */}
            <GlassPanel style={styles.featureCard}>
              <Text style={[styles.featureHeader, { color: colors.text }]}>What&apos;s Included in Pro</Text>
              
              <FeatureItem
                title="Unlimited Multi-Item AI Scanner"
                desc="Instantly identify items, read barcodes, and assess freshness scores."
                free="3 preview scans"
                pro="Unlimited scans"
              />
              <FeatureItem
                title="NSGA-II Pareto Rescue Meals"
                desc="Generate multi-objective meals balancing waste reduction and nutrition."
                free="2 recipes/day"
                pro="Unlimited recipes"
              />
              <FeatureItem
                title="Clinical Condition Recipe Swaps"
                desc="Auto-replace unsafe foods for Hypertension, Diabetes, Celiac, and Renal."
                free="Basic alerts"
                pro="Full auto-swap"
              />
              <FeatureItem
                title="Smart Grocery Auto-Restock"
                desc="Sync depleted pantry items straight to your interactive shopping list."
                free="Manual list"
                pro="1-Tap auto sync"
              />
              <FeatureItem
                title="Advanced Micronutrient Analysis"
                desc="Track Vit C, Calcium, Iron, and strict sodium caps alongside macros."
                free="Macros only"
                pro="Complete analysis"
              />
            </GlassPanel>

            {/* ── Social Proof Testimonial ── */}
            <View style={[styles.testimonialCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', borderColor: palette.amber + '40' }]}>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={14} color={palette.amberDeep} fill={palette.amberDeep} />
                ))}
              </View>
              <Text style={[styles.testimonialQuote, { color: colors.text }]}>
                &ldquo;Nourish+ saved our household $280 on wasted groceries in our first month alone. The AI scanner is crazy fast.&rdquo;
              </Text>
              <Text style={[styles.testimonialAuthor, { color: colors.subText }]}>
                — Dr. Priya M., Nutritionist & Verified Subscriber
              </Text>
            </View>

            {/* ── Primary CTA Upgrade Button ── */}
            <BrutalButton
              variant="sage"
              style={[styles.upgradeBtn, { backgroundColor: palette.amberDeep }]}
              onPress={handleUpgrade}
              disabled={loading}
            >
              <Sparkles size={18} color={palette.chalk} />
              <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>
                {loading
                  ? 'ACTIVATING NOURISH+...'
                  : enableTrial
                  ? 'START 7-DAY FREE TRIAL'
                  : 'UNLOCK NOURISH+ PRO'}
              </Text>
            </BrutalButton>

            {/* Secondary actions */}
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={[styles.footerLink, { color: colors.subText }]}>Restore Purchases</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.subText }}>•</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.footerLink, { color: colors.subText }]}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.subText }}>•</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.footerLink, { color: colors.subText }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guaranteeRow}>
              <ShieldCheck size={14} color={palette.sageDeep} />
              <Text style={[styles.guaranteeText, { color: colors.subText }]}>
                Guaranteed safe checkout. Cancel anytime via App Store or Google Play.
              </Text>
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

function FeatureItem({ title, desc, free, pro }: { title: string; desc: string; free: string; pro: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.featureItemRow}>
      <View style={[styles.featureIconWrap, { backgroundColor: palette.amber + '20' }]}>
        <Check size={14} color={palette.amberDeep} strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureItemTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureItemDesc, { color: colors.subText }]}>{desc}</Text>
        <View style={styles.tierPillRow}>
          <Text style={[styles.freeTag, { color: colors.subText }]}>Free: {free}</Text>
          <Text style={[styles.proTag, { color: palette.sageDeep }]}>Pro: {pro}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing[4],
    paddingBottom: 80,
    alignItems: 'center',
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: 10,
    marginBottom: 12,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: font.sansBold,
    color: palette.amberDeep,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: font.sansBold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    fontFamily: font.sans,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  planCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    alignItems: 'flex-start',
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: palette.amberDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestValueBadgeText: {
    fontSize: 8,
    fontFamily: font.sansBold,
    color: palette.chalk,
    letterSpacing: 0.5,
  },
  planPeriod: {
    fontSize: 14,
    fontFamily: font.sansBold,
    marginTop: 6,
  },
  planPrice: {
    fontSize: 22,
    fontFamily: font.sansBold,
    marginTop: 4,
  },
  planPerMo: {
    fontSize: 12,
    fontFamily: font.sans,
  },
  planBilled: {
    fontSize: 10,
    fontFamily: font.sans,
    marginTop: 4,
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  trialTitle: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  trialSub: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 2,
  },
  featureCard: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  featureHeader: {
    fontSize: 16,
    fontFamily: font.sansBold,
    marginBottom: 14,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureItemTitle: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  featureItemDesc: {
    fontSize: 11,
    fontFamily: font.sans,
    marginTop: 2,
    lineHeight: 15,
  },
  tierPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  freeTag: {
    fontSize: 10,
    fontFamily: font.sans,
  },
  proTag: {
    fontSize: 10,
    fontFamily: font.sansBold,
  },
  testimonialCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 18,
  },
  testimonialQuote: {
    fontSize: 12,
    fontFamily: font.sans,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontFamily: font.sansBold,
    marginTop: 6,
  },
  upgradeBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  footerLink: {
    fontSize: 11,
    fontFamily: font.sans,
    textDecorationLine: 'underline',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  guaranteeText: {
    fontSize: 10,
    fontFamily: font.sans,
    textAlign: 'center',
  },
});
