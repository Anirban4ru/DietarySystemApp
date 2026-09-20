import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Zap, Target, Leaf, Flame, ScanLine, Crown } from 'lucide-react-native';
import { palette, type, spacing } from '@/lib/theme';
import { useTheme, GlassPanel, BrutalButton, PressScale } from '@/components/ui';
import { usePro, useInventory, useImpact, useXp } from '@/lib/hooks';
import { PaywallModal } from '@/components/PaywallModal';

export default function Dashboard() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { isPro } = usePro();
  const { items } = useInventory();
  const { xp } = useXp();
  const { log } = useImpact();

  const [showPaywall, setShowPaywall] = useState(false);

  // Derived stats
  const expiringSoon = items.filter(i => {
    if(!i.expires_at) return false;
    const days = (new Date(i.expires_at).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  }).length;

  const totalCo2Saved = log.filter(l => l.event_type === 'rescue_meal').reduce((sum, l) => sum + l.co2e_kg, 0);

  // Time of day logic
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  let mealContext = 'Time for dinner?';
  if (hour < 12) { greeting = 'Good morning'; mealContext = 'Log your breakfast.'; }
  else if (hour < 17) { greeting = 'Good afternoon'; mealContext = 'Time for a healthy lunch?'; }

  const handleScanPress = () => {
    // We let them go to the scan screen, but paywall will be enforced inside the scan screen for AI features.
    // Or we can just let everyone scan manually, and pro gets AI.
    router.push('/scan');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[type.h3, { color: colors.subText }]}>{greeting},</Text>
            <Text style={[type.display, { color: colors.text, fontSize: 28 }]}>Let&apos;s Nourish.</Text>
          </View>
          {!isPro && (
            <PressScale onPress={() => setShowPaywall(true)} style={[styles.proBadge, { backgroundColor: palette.amber + '20', borderColor: palette.amber + '40', borderWidth: 1 }]}>
              <Crown size={14} color={palette.amberDeep} />
              <Text style={[type.label, { color: palette.amberDeep, marginLeft: 4 }]}>PRO</Text>
            </PressScale>
          )}
        </View>

        {/* Primary Action */}
        <PressScale scale={0.97} onPress={handleScanPress} style={styles.scanBtnWrap}>
          <View style={[styles.scanBtn, { backgroundColor: palette.sageDeep }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.scanIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <ScanLine size={24} color={palette.chalk} />
              </View>
              <View>
                <Text style={[type.h2, { color: palette.chalk }]}>Scan Items</Text>
                <Text style={[type.bodySm, { color: 'rgba(255,255,255,0.8)' }]}>AI Visual or Barcode</Text>
              </View>
            </View>
            <Zap size={20} color={palette.amber} />
          </View>
        </PressScale>

        {/* Smart Context Widget */}
        <GlassPanel style={styles.contextWidget}>
          <View style={styles.contextHeader}>
            <Target size={18} color={palette.amberDeep} />
            <Text style={[type.label, { color: palette.amberDeep }]}>UP NEXT</Text>
          </View>
          <Text style={[type.h2, { color: colors.text, marginTop: spacing[2] }]}>{mealContext}</Text>
          <Text style={[type.body, { color: colors.subText, marginTop: 4 }]}>
            You have {expiringSoon} items expiring soon. Use them in your next meal to maintain your streak.
          </Text>
          <BrutalButton variant="outline" style={{ marginTop: spacing[4] }} onPress={() => router.push('/recipes')}>
            VIEW RESCUE RECIPES
          </BrutalButton>
        </GlassPanel>

        {/* Stats Grid */}
        <View style={styles.grid}>
          <GlassPanel style={[styles.gridCard, { flex: 1 }]}>
            <Flame size={24} color={palette.crimson} style={{ marginBottom: spacing[2] }} />
            <Text style={[type.h1, { color: colors.text }]}>{xp}</Text>
            <Text style={[type.bodySm, { color: colors.subText }]}>Total XP</Text>
          </GlassPanel>

          <GlassPanel style={[styles.gridCard, { flex: 1 }]}>
            <Leaf size={24} color={palette.sage} style={{ marginBottom: spacing[2] }} />
            <Text style={[type.h1, { color: colors.text }]}>{totalCo2Saved.toFixed(1)}kg</Text>
            <Text style={[type.bodySm, { color: colors.subText }]}>CO₂ Saved</Text>
          </GlassPanel>
        </View>

      </ScrollView>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing[5],
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
    marginTop: spacing[2],
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanBtnWrap: {
    marginBottom: spacing[5],
    shadowColor: palette.sageDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderRadius: 24,
  },
  scanIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextWidget: {
    marginBottom: spacing[5],
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  gridCard: {
    alignItems: 'center',
    padding: spacing[4],
  }
});
