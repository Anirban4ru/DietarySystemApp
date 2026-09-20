import { Tabs } from 'expo-router';
import { Home, Boxes, ChefHat, User } from 'lucide-react-native';
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

  const tabBarHeight = 58 + Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mode === 'dark' ? palette.sageMist : palette.sageDeep,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          backgroundColor: mode === 'dark' ? '#111813' : '#F9FBF9',
          borderTopWidth: 1,
          borderTopColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: mode === 'dark' ? 0.3 : 0.05,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter-Bold',
          letterSpacing: 0.6,
          marginTop: 4,
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
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, focused }) => (
            <Boxes color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.6 : 2} />
          ),
          tabBarBadge: urgentCount > 0 ? urgentCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: palette.crimson,
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
          title: 'Kitchen',
          tabBarIcon: ({ color, focused }) => (
            <ChefHat color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.6 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
