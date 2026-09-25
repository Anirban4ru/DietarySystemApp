import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { palette, type, spacing } from '@/lib/theme';
import { useTheme, PrimaryAction, SecondaryAction, SurfaceCard } from './ui';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.stateCenterContainer}>
      <View style={[styles.stateIconCircle, { backgroundColor: palette.crimsonMist }]}>
        <AlertTriangle size={32} color={palette.crimson} strokeWidth={2} />
      </View>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginTop: 8, maxWidth: 300 }]}>
        {message}
      </Text>
      {onRetry && (
        <View style={{ marginTop: spacing[5], width: 180 }}>
          <PrimaryAction label={retryLabel} onPress={onRetry} icon={RefreshCw} />
        </View>
      )}
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  actionLabel,
  onAction,
}: {
  icon: any;
  title: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const bodyText = message ?? description ?? '';

  return (
    <View style={styles.stateCenterContainer}>
      <View style={[styles.stateIconCircle, { backgroundColor: colors.paperBg }]}>
        {Icon && (React.isValidElement(Icon) ? Icon : <Icon size={34} color={colors.subText} strokeWidth={1.8} />)}
      </View>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {bodyText ? (
        <Text style={[type.body, { color: colors.subText, textAlign: 'center', marginTop: 8, maxWidth: 300 }]}>
          {bodyText}
        </Text>
      ) : null}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing[5], minWidth: 160 }}>
          <PrimaryAction label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.modalBackdrop}>
        <SurfaceCard style={styles.confirmCard} variant="elevated">
          <Text style={[type.h2, { color: colors.text, marginBottom: 8 }]}>{title}</Text>
          <Text style={[type.body, { color: colors.subText, lineHeight: 22, marginBottom: spacing[6] }]}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SecondaryAction label={cancelLabel} onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryAction
                label={confirmLabel}
                onPress={onConfirm}
                variant={destructive ? 'burgundy' : 'sage'}
              />
            </View>
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stateCenterContainer: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing[5],
  },
  confirmCard: {
    borderRadius: 20,
    padding: spacing[5],
  },
});
