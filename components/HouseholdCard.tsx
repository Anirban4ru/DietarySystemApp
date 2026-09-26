import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Users, Plus, UserPlus, Share2, LogOut, X } from 'lucide-react-native';
import { hapticTap, hapticSuccess, hapticWarning, hapticSelection } from '@/lib/haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, useToast, SurfaceCard, StatusBadge, PrimaryAction, SecondaryAction } from './ui';
import { useHousehold } from '@/lib/hooks';

export function HouseholdSharingCard() {
  const { colors } = useTheme();
  const toast = useToast();
  const { household, loading, createHousehold, joinHousehold, leaveHousehold } = useHousehold();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreate = () => {
    hapticSelection();
    setModalMode('create');
    setInputValue('');
    setModalVisible(true);
  };

  const handleOpenJoin = () => {
    hapticSelection();
    setModalMode('join');
    setInputValue('');
    setModalVisible(true);
  };

  const handleShareCode = async () => {
    if (!household?.invite_code) return;
    hapticTap();
    try {
      await Share.share({
        message: `Join our pantry on Nourish! Use invite code: ${household.invite_code}`,
        title: 'Join Nourish Pantry',
      });
    } catch (e: any) {
      toast.show(e.message || 'Failed to share code', 'error');
    }
  };

  const handleLeave = () => {
    hapticWarning();
    Alert.alert(
      'Leave Household Pantry',
      'Are you sure you want to leave this shared pantry? You will revert to your personal pantry list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const res = await leaveHousehold();
            if (res.success) {
              toast.show('Left household pantry', 'info');
            } else {
              toast.show('Failed to leave household', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const val = inputValue.trim();
    if (!val) {
      toast.show(modalMode === 'create' ? 'Please enter a household name' : 'Please enter an invite code', 'info');
      return;
    }

    setSubmitting(true);
    hapticTap();

    if (modalMode === 'create') {
      const res = await createHousehold(val);
      setSubmitting(false);
      if (res.success) {
        hapticSuccess();
        toast.show('Household created successfully!', 'success');
        setModalVisible(false);
      } else {
        toast.show(res.error || 'Failed to create household', 'error');
      }
    } else {
      const res = await joinHousehold(val);
      setSubmitting(false);
      if (res.success) {
        hapticSuccess();
        toast.show('Joined household pantry!', 'success');
        setModalVisible(false);
      } else {
        toast.show(res.error || 'Invalid or expired invite code', 'error');
      }
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(2, 51, 45, 0.12)' }]}>
          <Users size={20} color={palette.forestDeep} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={[styles.title, { color: colors.text }]}>Household Pantry</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Shared inventory & multi-member grocery sync
          </Text>
        </View>
        {household && (
          <StatusBadge
            label={`${household.members_count || 1} MEMBER${(household.members_count || 1) > 1 ? 'S' : ''}`}
            variant="success"
            size="sm"
          />
        )}
      </View>

      {loading ? (
        <View style={{ paddingVertical: spacing[4], alignItems: 'center' }}>
          <ActivityIndicator color={palette.forestDeep} size="small" />
        </View>
      ) : household ? (
        <View style={{ marginTop: spacing[3], gap: 12 }}>
          <View style={[styles.householdInfoBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View>
              <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.8 }]}>ACTIVE PANTRY</Text>
              <Text style={[type.h2, { color: colors.text, marginTop: 2 }]}>{household.name}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.8 }]}>INVITE CODE</Text>
              <Text style={[type.monoBold, { fontSize: 16, color: palette.forestDeep, letterSpacing: 1.2, marginTop: 2 }]}>
                {household.invite_code}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryAction
                label="Share Code"
                onPress={handleShareCode}
                icon={Share2}
                variant="sage"
              />
            </View>
            <TouchableOpacity
              onPress={handleLeave}
              style={[styles.leaveBtn, { borderColor: palette.danger }]}
              accessibilityLabel="Leave household"
              activeOpacity={0.7}
            >
              <LogOut size={16} color={palette.danger} strokeWidth={2.2} />
              <Text style={[type.bodySm, { color: palette.danger, fontWeight: '700', fontSize: 13 }]}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: spacing[3], gap: 12 }}>
          <Text style={[type.bodySm, { color: colors.subText, lineHeight: 18 }]}>
            Share inventory in real-time with family or flatmates to eliminate duplicate grocery trips and cut waste.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryAction
                label="Create Household"
                onPress={handleOpenCreate}
                icon={Plus}
                variant="sage"
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryAction
                label="Join with Code"
                onPress={handleOpenJoin}
                icon={UserPlus}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Create / Join Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[type.h2, { color: colors.text }]}>
                {modalMode === 'create' ? 'Create Household' : 'Join Household'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close modal"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.subText} />
              </TouchableOpacity>
            </View>

            <Text style={[type.bodySm, { color: colors.subText, marginBottom: 12 }]}>
              {modalMode === 'create'
                ? 'Name your shared home pantry (e.g. "Chatterjee Kitchen").'
                : 'Enter the 6-character invite code provided by your household admin.'}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={modalMode === 'create' ? 'Household Name' : 'NOURISH-XXXXXX'}
              placeholderTextColor={colors.subText}
              value={inputValue}
              onChangeText={setInputValue}
              autoCapitalize={modalMode === 'join' ? 'characters' : 'words'}
              autoCorrect={false}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <SecondaryAction label="Cancel" onPress={() => setModalVisible(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryAction
                  label={submitting ? 'Submitting...' : modalMode === 'create' ? 'Create' : 'Join'}
                  onPress={handleSubmit}
                  variant="sage"
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: font.sansBold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: font.sans,
    fontSize: 12,
    marginTop: 2,
  },
  householdInfoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: font.sansMed,
  },
});
