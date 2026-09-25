/**
 * components/UpdateOverlay.tsx
 * Phase 4: Non-blocking OTA update banner.
 * - Checks for updates on cold start AND when app returns to foreground
 * - Shows a small dismissible bottom banner — never blocks the UI
 * - Does NOT show while the user is on the scan or onboarding screens
 * - Silently ignores all network errors
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useSegments } from 'expo-router';
import { ArrowUpCircle, X } from 'lucide-react-native';
import { hapticSuccess } from '@/lib/haptics';
import { palette, font, spacing } from '@/lib/theme';

// Screens where we suppress the update banner mid-action
const SUPPRESS_SEGMENTS = ['scan', 'onboarding'];

export function UpdateOverlay() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const segments = useSegments();

  const checkForUpdate = useCallback(async () => {
    if (!Updates.isEnabled || __DEV__) return;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        // Download silently in the background
        await Updates.fetchUpdateAsync();
        setUpdateAvailable(true);
        setDismissed(false); // re-show if available again after foreground
      }
    } catch {
      // Silently ignore — never surface a raw update error to the user
    }
  }, []);

  // Check on cold start
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  // Check when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkForUpdate();
      }
    });
    return () => sub.remove();
  }, [checkForUpdate]);

  // Suppress banner if user is mid-action on scan/onboarding
  const currentSegment = segments[segments.length - 1] ?? '';
  const isSuppressed = SUPPRESS_SEGMENTS.some((s) => currentSegment.includes(s));

  if (!updateAvailable || dismissed || isSuppressed) return null;

  const handleApply = async () => {
    hapticSuccess();
    try {
      await Updates.reloadAsync();
    } catch {
      // If reload fails, just dismiss silently
      setDismissed(true);
    }
  };

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <ArrowUpCircle size={18} color={palette.chalk} strokeWidth={2.2} />
      <Text style={styles.bannerText} numberOfLines={1}>
        Update available — tap to apply
      </Text>
      <TouchableOpacity
        onPress={handleApply}
        style={styles.applyBtn}
        accessibilityLabel="Apply update and restart"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.applyText}>Restart</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss update banner"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={palette.chalk} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: palette.forestDeep,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerText: {
    flex: 1,
    color: palette.chalk,
    fontFamily: font.sans,
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minHeight: 30,
    justifyContent: 'center',
  },
  applyText: {
    color: palette.chalk,
    fontFamily: font.sansBold,
    fontSize: 12,
  },
  closeBtn: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
