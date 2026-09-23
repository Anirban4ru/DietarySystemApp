import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES TYPE
// ─────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  expiryAlerts: boolean;
  dailyRescue: boolean;
  mealPrep: boolean;
  shoppingReminder: boolean;
  weeklyImpact: boolean;
  milestones: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  expiryAlerts: true,
  dailyRescue: true,
  mealPrep: true,
  shoppingReminder: true,
  weeklyImpact: true,
  milestones: true,
};

const STORAGE_KEY = '@nourish_notification_preferences';

// Configure foreground display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─────────────────────────────────────────────────────────────────
// PREFERENCES STORAGE
// ─────────────────────────────────────────────────────────────────

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Synchronize scheduled notifications with new preferences
    await syncScheduledNotifications(updated);
    return updated;
  } catch (error) {
    console.warn('[Notifications] Failed to save preferences:', error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

// ─────────────────────────────────────────────────────────────────
// CONTEXTUAL PERMISSION REQUEST
// ─────────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Android notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nourish-daily', {
        name: 'Daily Kitchen Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E4D18',
      });

      await Notifications.setNotificationChannelAsync('nourish-alerts', {
        name: 'Pantry Freshness & Expiry',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400],
        lightColor: '#991B1B',
      });
    }

    return true;
  } catch (error) {
    console.warn('[Notifications] Permission request error:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// IDEMPOTENT LOCAL NOTIFICATION SCHEDULING
// ─────────────────────────────────────────────────────────────────

export async function scheduleDailyMealReminder() {
  if (Platform.OS === 'web') return;
  const prefs = await getNotificationPreferences();
  if (!prefs.mealPrep) {
    await Notifications.cancelScheduledNotificationAsync('daily-meal').catch(() => {});
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync('daily-meal').catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-meal',
      content: {
        title: 'Plan your meals today',
        body: "Check your meal plan and see what's ready to cook in your pantry.",
        sound: true,
        data: { screen: 'plan' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
  } catch (err) {
    console.warn('[Notifications] Failed scheduling daily meal reminder:', err);
  }
}

export async function scheduleDailyShoppingReminder() {
  if (Platform.OS === 'web') return;
  const prefs = await getNotificationPreferences();
  if (!prefs.shoppingReminder) {
    await Notifications.cancelScheduledNotificationAsync('daily-shop').catch(() => {});
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync('daily-shop').catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-shop',
      content: {
        title: 'Check your grocery list',
        body: 'You have items saved on your smart shopping list.',
        sound: true,
        data: { screen: 'shopping' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  } catch (err) {
    console.warn('[Notifications] Failed scheduling shopping reminder:', err);
  }
}

export async function scheduleDailyRescueReminder() {
  if (Platform.OS === 'web') return;
  const prefs = await getNotificationPreferences();
  if (!prefs.dailyRescue) {
    await Notifications.cancelScheduledNotificationAsync('daily-rescue').catch(() => {});
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync('daily-rescue').catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-rescue',
      content: {
        title: 'Rescue dinner suggestion',
        body: 'Check rescue recipes for items nearing peak freshness in your fridge.',
        sound: true,
        data: { screen: 'recipes' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 15,
      },
    });
  } catch (err) {
    console.warn('[Notifications] Failed scheduling daily rescue reminder:', err);
  }
}

export async function sendExpiryAlert(itemName: string, daysLeft: number) {
  if (Platform.OS === 'web') return;
  const prefs = await getNotificationPreferences();
  if (!prefs.expiryAlerts) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${itemName} expires ${daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}`,
        body: 'Open Nourish to see storage tips or generate a rescue recipe.',
        sound: true,
        data: { screen: 'inventory' },
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.warn('[Notifications] Failed sending expiry alert:', err);
  }
}

export async function sendMilestoneNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  const prefs = await getNotificationPreferences();
  if (!prefs.milestones) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: 'impact' },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('[Notifications] Failed sending milestone notification:', err);
  }
}

export async function syncScheduledNotifications(prefs: NotificationPreferences) {
  if (Platform.OS === 'web') return;

  if (prefs.mealPrep) await scheduleDailyMealReminder();
  else await Notifications.cancelScheduledNotificationAsync('daily-meal').catch(() => {});

  if (prefs.shoppingReminder) await scheduleDailyShoppingReminder();
  else await Notifications.cancelScheduledNotificationAsync('daily-shop').catch(() => {});

  if (prefs.dailyRescue) await scheduleDailyRescueReminder();
  else await Notifications.cancelScheduledNotificationAsync('daily-rescue').catch(() => {});
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('[Notifications] Failed cancelling notifications:', err);
  }
}
