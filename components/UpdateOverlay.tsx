import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { ArrowUpCircle, RefreshCw, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, font, spacing } from '@/lib/theme';
import { PressableScale } from './motion';

export function UpdateOverlay() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkForUpdates() {
      // In Expo Go or development, Updates.isEnabled is false
      if (!Updates.isEnabled || __DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Silently ignore network failures during background update check
        console.log('Update check error:', e);
      }
    }

    checkForUpdates();
  }, []);

  const handleUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);
    setErrorMessage(null);
    try {
      await Updates.fetchUpdateAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Updates.reloadAsync();
    } catch (error: any) {
      console.error('Error fetching update:', error);
      setErrorMessage(error?.message || 'Download failed. Please check your internet connection.');
      setDownloading(false);
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <ArrowUpCircle size={28} color={palette.forestDeep} strokeWidth={2.2} />
        </View>

        <Text style={styles.title}>Update Ready to Install</Text>
        <Text style={styles.message}>
          A new release of Dietary System with performance enhancements and wellness fixes is available.
        </Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <XCircle size={15} color={palette.burgundy} strokeWidth={2.5} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.btnStack}>
          <PressableScale
            style={styles.primaryBtn}
            onPress={handleUpdate}
            disabled={downloading}
            accessibilityLabel="Install update and restart"
          >
            {downloading ? (
              <ActivityIndicator color={palette.chalk} size="small" />
            ) : (
              <View style={styles.btnContent}>
                <RefreshCw size={16} color={palette.chalk} strokeWidth={2.5} />
                <Text style={styles.primaryBtnText}>Install & Restart</Text>
              </View>
            )}
          </PressableScale>

          <PressableScale
            style={styles.laterBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setDismissed(true);
            }}
            accessibilityLabel="Dismiss update for later"
          >
            <Text style={styles.laterBtnText}>Later</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 10, 9, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: spacing[5],
  },
  container: {
    backgroundColor: '#FAFAF7',
    borderRadius: 24,
    padding: spacing[6],
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E8E3D9',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(61, 107, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 19,
    fontFamily: font.sansBold,
    marginBottom: 8,
    color: '#1C1917',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: font.sans,
    textAlign: 'center',
    marginBottom: spacing[4],
    color: '#78716C',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(153, 27, 27, 0.08)',
    borderColor: palette.burgundy,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: spacing[3],
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: font.sans,
    color: palette.burgundy,
    flex: 1,
  },
  btnStack: {
    width: '100%',
    gap: 8,
    marginTop: spacing[2],
  },
  primaryBtn: {
    backgroundColor: palette.forestDeep,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: palette.chalk,
    fontFamily: font.sansBold,
    fontSize: 15,
  },
  laterBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  laterBtnText: {
    color: '#78716C',
    fontFamily: font.sans,
    fontSize: 14,
  },
});
