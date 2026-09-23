import { Tabs } from 'expo-router';
import { Home, Boxes, CalendarDays, TrendingUp, User } from 'lucide-react-native';
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

  const tabBarHeight = 60 + Math.max(insets.bottom, 10);
  const isDark = mode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? palette.sageMist : palette.sageDeep,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          backgroundColor: isDark ? '#12100E' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          elevation: 16,
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.04,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter-Bold',
          letterSpacing: 0.5,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          minHeight: 44,
          minWidth: 44,
        },
      }}
    >
      {/* 1. Today */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 2. Pantry */}
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Pantry',
          tabBarLabel: 'Pantry',
          tabBarIcon: ({ color, focused }) => (
            <Boxes color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.5 : 2} />
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

      {/* 3. Plan */}
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarLabel: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 4. Impact */}
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact',
          tabBarLabel: 'Impact',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Preserved Route Compatibility: Recipes & Shopping accessible via deep link / tabs */}
      <Tabs.Screen
        name="recipes"
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
    </Tabs>
  );
}
