import { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Crown, Sparkles, Check, X, ShieldCheck } from 'lucide-react-native';
import { palette, type, spacing } from '@/lib/theme';
import { useTheme, BrutalButton, GlassPanel } from '@/components/ui';
import { usePro } from '@/lib/hooks';

export function PaywallModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, mode } = useTheme();
  const { setIsPro } = usePro();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setIsPro(true);
      setLoading(false);
      onClose();
    }, 1500);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <BlurView intensity={90} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.iconWrap}>
              <Crown size={48} color={palette.amber} strokeWidth={1.5} />
            </View>

            <Text style={[type.display, { color: colors.text, textAlign: 'center', marginBottom: spacing[2] }]}>
              Nourish<Text style={{ color: palette.amber }}>+</Text>
            </Text>
            <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginBottom: spacing[6] }]}>
              Unlock the ultimate intelligent dietary engine.
            </Text>

            <GlassPanel style={styles.featureCard}>
              <FeatureRow title="Advanced AI Visual Scanning" desc="Instantly detect multiple ingredients and assess freshness." />
              <FeatureRow title="Smart Receipt Parsing" desc="Batch-add your entire grocery run in seconds." />
              <FeatureRow title="Macronutrient Optimization" desc="Personalized daily targets based on your biometric profile." />
              <FeatureRow title="Unlimited Recipe Generation" desc="Never run out of ideas to rescue expiring food." />
            </GlassPanel>

            <View style={styles.priceWrap}>
              <Text style={[type.h1, { color: colors.text }]}>$4.99</Text>
              <Text style={[type.bodySm, { color: colors.subText }]}>/ month</Text>
            </View>

            <BrutalButton
              variant="sage"
              style={[styles.upgradeBtn, { backgroundColor: palette.amberDeep }]}
              onPress={handleUpgrade}
              disabled={loading}
            >
              <Sparkles size={18} color={palette.chalk} />
              <Text style={[type.label, { color: palette.chalk, marginLeft: 8 }]}>
                {loading ? 'PROCESSING...' : 'UPGRADE TO NOURISH+'}
              </Text>
            </BrutalButton>

            <View style={styles.footer}>
              <ShieldCheck size={14} color={colors.subText} />
              <Text style={[type.bodySm, { color: colors.subText, marginLeft: 4 }]}>Cancel anytime. Secure processing.</Text>
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.checkWrap, { backgroundColor: palette.amber + '20' }]}>
        <Check size={14} color={palette.amberDeep} strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.h3, { color: colors.text }]}>{title}</Text>
        <Text style={[type.bodySm, { color: colors.subText, marginTop: 2 }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(120,120,120,0.2)',
  },
  scroll: {
    padding: spacing[6],
    paddingBottom: 100,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.amber + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: palette.amber + '40',
  },
  featureCard: {
    width: '100%',
    padding: spacing[5],
    marginBottom: spacing[6],
    borderColor: palette.amber + '30',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    gap: 12,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing[5],
  },
  upgradeBtn: {
    width: '100%',
    paddingVertical: spacing[4],
    borderRadius: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  }
});
