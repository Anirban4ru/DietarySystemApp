import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Flame, Leaf, ShieldCheck, Info } from 'lucide-react-native';
import { palette, font, type, spacing } from '@/lib/theme';
import { GlassPanel, useTheme } from '@/components/ui';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

const TIPS = [
  { id: '1', title: 'Did you know?', text: 'Storing tomatoes in the fridge degrades their flavor. Keep them at room temperature!', icon: Flame, color: palette.amberDeep },
  { id: '2', title: 'Eco Tip', text: 'Freezing herbs in olive oil is a great way to save them before they wilt.', icon: Leaf, color: palette.sageDeep },
  { id: '3', title: 'Health Fact', text: 'Eating an apple gives you more reliable energy than a cup of coffee.', icon: ShieldCheck, color: palette.clayDeep },
  { id: '4', title: 'Pantry Hack', text: 'Keep a slice of bread in your brown sugar container to keep it soft.', icon: Info, color: '#3b82f6' },
];

export function TipFeed() {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        snapToInterval={CARD_WIDTH + 16} 
        decelerationRate="fast" 
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {TIPS.map((tip) => {
          const Icon = tip.icon;
          return (
            <View key={tip.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: tip.color + '22' }]}>
                  <Icon size={18} color={tip.color} strokeWidth={2.5} />
                </View>
                <Text style={[type.h2, { color: colors.text, marginLeft: 10, fontSize: 16 }]}>{tip.title}</Text>
              </View>
              <Text style={[type.body, { color: colors.subText, fontSize: 13, lineHeight: 20 }]}>{tip.text}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 110,
    marginBottom: spacing[4],
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
