import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions and return token (or null)
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nourish-daily', {
      name: 'Nourish Daily',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E4D18',
    });
    await Notifications.setNotificationChannelAsync('nourish-alerts', {
      name: 'Expiry Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400],
      lightColor: '#991B1B',
    });
  }

  return 'push-registered';
}

// Schedule daily meal plan reminder (9 AM)
export async function scheduleDailyMealReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-meal').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-meal',
    content: {
      title: '🍽️ Plan your meals today',
      body: "Check your Nourish meal plan and see what's in your pantry.",
      sound: true,
      data: { screen: 'plan' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

// Schedule daily shopping reminder (6 PM)
export async function scheduleDailyShoppingReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-shop').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-shop',
    content: {
      title: '🛒 Don\'t forget your shopping list',
      body: 'You have items on your Nourish shopping list.',
      sound: true,
      data: { screen: 'shopping' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });
}

// Send an immediate local notification (for expiry alerts)
export async function sendExpiryAlert(itemName: string, daysLeft: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ ${itemName} expires ${daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}`,
      body: 'Open Nourish to see storage tips or find a rescue recipe.',
      sound: true,
      data: { screen: 'inventory' },
    },
    trigger: null, // immediate
  });
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
