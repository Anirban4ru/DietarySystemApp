import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import { Bell, Clock, AlertCircle, Sparkles, ShoppingBag, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, SurfaceCard, PrimaryAction } from './ui';
import {
  NotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermissions,
} from '@/lib/notifications';

export function NotificationPreferencesCard() {
  const { colors, mode } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    expiryAlerts: true,
    dailyRescue: true,
    mealPrep: true,
    shoppingReminder: true,
    weeklyImpact: true,
    milestones: true,
  });
  const [permissionGranted, setPermissionGranted] = useState(true);

  useEffect(() => {
    getNotificationPreferences().then(setPrefs);
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    Haptics.selectionAsync();
    const updated = await saveNotificationPreferences({ [key]: value });
    setPrefs(updated);
  };

  const handleEnablePermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
  };

  const rows: { key: keyof NotificationPreferences; title: string; desc: string; icon: any }[] = [
    {
      key: 'expiryAlerts',
      title: 'Expiry & Freshness Warnings',
      desc: 'Local alerts when food is nearing expiration date',
      icon: AlertCircle,
    },
    {
      key: 'dailyRescue',
      title: 'Daily Rescue Suggestions',
      desc: 'Dinner ideas using ingredients in your fridge (5:15 PM)',
      icon: Sparkles,
    },
    {
      key: 'mealPrep',
      title: 'Meal Plan Reminders',
      desc: 'Morning reminder of scheduled recipes (9:00 AM)',
      icon: Clock,
    },
    {
      key: 'shoppingReminder',
      title: 'Smart Grocery Alerts',
      desc: 'Evening reminder for pending grocery items (6:00 PM)',
      icon: ShoppingBag,
    },
    {
      key: 'milestones',
      title: 'Sustainability & XP Milestones',
      desc: 'Celebrations when reaching weekly waste reduction goals',
      icon: ShieldCheck,
    },
  ];

  return (
    <SurfaceCard style={styles.card} variant="elevated">
      <View style={styles.headerRow}>
        <Bell size={20} color={palette.sageDeep} strokeWidth={2.2} />
        <Text style={[type.h2, { color: colors.text, marginLeft: 8 }]}>Notification Preferences</Text>
      </View>
      <Text style={[type.bodySm, { color: colors.subText, marginBottom: spacing[4] }]}>
        Local notifications run privately on your device. You can customize which reminders you receive.
      </Text>

      {Platform.OS !== 'web' && !permissionGranted && (
        <View style={[styles.permBanner, { backgroundColor: '#FEF3C7', borderColor: palette.amber }]}>
          <Text style={[type.bodySm, { color: palette.amberDeep, flex: 1 }]}>
            Notifications are currently muted in system settings.
          </Text>
          <PrimaryAction
            label="Enable"
            onPress={handleEnablePermission}
            variant="sage"
            style={{ minHeight: 36, paddingHorizontal: 12 }}
          />
        </View>
      )}

      <View style={{ gap: 14 }}>
        {rows.map((r) => {
          const Icon = r.icon;
          const isEnabled = prefs[r.key];
          return (
            <View key={r.key} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.paperBg }]}>
                <Icon size={18} color={isEnabled ? palette.sageDeep : colors.subText} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[type.h3, { color: colors.text, fontSize: 14, fontFamily: font.sansBold }]}>
                  {r.title}
                </Text>
                <Text style={[type.bodySm, { color: colors.subText, fontSize: 12, marginTop: 1 }]}>
                  {r.desc}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={(val) => handleToggle(r.key, val)}
                trackColor={{ false: colors.border, true: palette.sageDeep }}
                thumbColor={palette.chalk}
                accessibilityRole="switch"
                accessibilityLabel={r.title}
                accessibilityState={{ checked: isEnabled }}
              />
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginVertical: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
