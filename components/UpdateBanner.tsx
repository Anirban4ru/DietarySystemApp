import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { RefreshCw, X, ArrowUpCircle } from 'lucide-react-native';
import { hapticTap, hapticSuccess } from '@/lib/haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, SurfaceCard, PrimaryAction, IconButton } from './ui';
import { PressableScale } from './motion';

export function UpdateBanner() {
  const { colors, mode } = useTheme();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run update check when expo-updates is enabled (production/staging standalone builds)
    if (!Updates.isEnabled || __DEV__) {
      return;
    }

    async function checkUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Silently catch network errors during update check to not disrupt UX
        console.log('Update check failed:', e);
      }
    }

    checkUpdate();
  }, []);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleApplyUpdate = async () => {
    hapticTap();
    setDownloading(true);
    try {
      await Updates.fetchUpdateAsync();
      hapticSuccess();
      await Updates.reloadAsync();
    } catch (e) {
      console.log('Failed to fetch update:', e);
      setDownloading(false);
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <SurfaceCard style={[styles.card, { borderColor: palette.forestDeep }]}>
        <View style={styles.contentRow}>
          <View style={styles.iconCircle}>
            <ArrowUpCircle size={22} color={palette.forestDeep} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <Text style={[styles.title, { color: colors.text }]}>New Update Available</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>
              A new version of Dietary System with performance fixes is ready.
            </Text>
          </View>
          <IconButton
            icon={<X size={16} color={colors.subText} strokeWidth={2.5} />}
            onPress={() => setDismissed(true)}
            accessibilityLabel="Dismiss update banner"
            size={32}
          />
        </View>

        <View style={styles.actionRow}>
          <PressableScale
            onPress={handleApplyUpdate}
            disabled={downloading}
            style={[styles.applyBtn, { backgroundColor: palette.forestDeep }]}
          >
            <RefreshCw
              size={15}
              color={palette.chalk}
              strokeWidth={2.5}
              style={downloading ? { transform: [{ rotate: '45deg' }] } : undefined}
            />
            <Text style={[styles.applyBtnText, { color: palette.chalk }]}>
              {downloading ? 'Downloading...' : 'Update & Restart'}
            </Text>
          </PressableScale>

          <PressableScale
            onPress={() => setDismissed(true)}
            style={styles.laterBtn}
          >
            <Text style={[styles.laterBtnText, { color: colors.subText }]}>Later</Text>
          </PressableScale>
        </View>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    zIndex: 999,
  },
  card: {
    padding: spacing[3],
    borderWidth: 1.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(61, 107, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: font.sansBold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: font.sans,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing[3],
    paddingTop: spacing[2],
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 44,
  },
  applyBtnText: {
    fontSize: 13,
    fontFamily: font.sansBold,
  },
  laterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  laterBtnText: {
    fontSize: 13,
    fontFamily: font.sans,
  },
});
