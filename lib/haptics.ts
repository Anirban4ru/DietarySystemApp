/**
 * lib/haptics.ts
 * Centralized haptic feedback helpers.
 * All calls are guarded for web (haptics don't exist there and must not throw).
 * Replace all direct Haptics.* calls in screen files with these named helpers.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function safeHaptic(fn: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  fn().catch(() => {
    // Haptic failures are non-fatal — silently ignore
  });
}

/** Light tap — use for selections, checkbox toggles, tab changes */
export function hapticTap(): void {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium impact — use for confirmations, successful saves */
export function hapticSuccess(): void {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning — use for destructive actions (delete confirm) */
export function hapticWarning(): void {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Error — use for failed actions, validation errors */
export function hapticError(): void {
  safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Selection change — use for picker/segment scrolls */
export function hapticSelection(): void {
  safeHaptic(() => Haptics.selectionAsync());
}

/** Heavy impact — use for leveling up, milestone achievements */
export function hapticHeavy(): void {
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}
