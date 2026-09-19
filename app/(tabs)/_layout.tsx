import { Tabs } from 'expo-router';
import { Home, Boxes, ChefHat, User, ScanLine, Calendar, ShoppingCart, Leaf } from 'lucide-react-native';
import { useTheme } from '@/components/ui';
import { palette } from '@/lib/theme';
import { useInventory } from '@/lib/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function daysLeft(expires_at: string | null): number {
  if (!expires_at) return 999;
  return Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000);
}

export default function TabLayout() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();

  // Count items expiring within 3 days for badge
  const urgentCount = items.filter((i) => daysLeft(i.expires_at) <= 3 && daysLeft(i.expires_at) >= 0).length;

  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mode === 'dark' ? palette.sageMist : palette.sageDeep,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1.5,
          borderTopColor: mode === 'dark' ? palette.darkBorder : palette.hair,
          height: tabBarHeight,
          paddingBottom: insets.bottom || 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: 'Inter-Bold',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => <Boxes color={color} size={size - 2} strokeWidth={2.5} />,
          tabBarBadge: urgentCount > 0 ? urgentCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: palette.danger,
            color: palette.chalk,
            fontSize: 10,
            fontFamily: 'Inter-Bold',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 18,
          },
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Rescue',
          tabBarIcon: ({ color, size }) => <ChefHat color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact',
          tabBarIcon: ({ color, size }) => <Leaf color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
