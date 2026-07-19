import { Tabs } from 'expo-router';
import { ScanLine, Boxes, ChefHat, User, Leaf, Calendar, ShoppingCart } from 'lucide-react-native';
import { useTheme } from '@/components/ui';
import { palette } from '@/lib/theme';

export default function TabLayout() {
  const { colors, mode } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mode === 'dark' ? palette.sageMist : palette.sageDeep,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 3,
          borderTopColor: mode === 'dark' ? palette.darkBorder : palette.ink,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontFamily: 'Inter-Bold',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: 'Pantry', tabBarIcon: ({ color, size }) => <Boxes color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: 'Rescue', tabBarIcon: ({ color, size }) => <ChefHat color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: 'Shop', tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="impact"
        options={{ title: 'Impact', tabBarIcon: ({ color, size }) => <Leaf color={color} size={size} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2.5} /> }}
      />
    </Tabs>
  );
}
