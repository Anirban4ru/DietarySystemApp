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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {
  Users,
  Plus,
  UserPlus,
  Share2,
  LogOut,
  X,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
} from 'lucide-react-native';
import { hapticTap, hapticSuccess, hapticWarning, hapticSelection } from '@/lib/haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { useTheme, useToast, SurfaceCard, StatusBadge, PrimaryAction, SecondaryAction } from './ui';
import { useHousehold, HouseholdMember } from '@/lib/hooks';

export function HouseholdSharingCard() {
  const { colors } = useTheme();
  const toast = useToast();
  const { household, loading, createHousehold, joinHousehold, leaveHousehold } = useHousehold();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleCopyCode = async () => {
    if (!household?.invite_code) return;
    hapticSuccess();
    setCopiedCode(true);
    toast.show(`Invite code "${household.invite_code}" ready to share!`, 'success');
    setTimeout(() => setCopiedCode(false), 2500);

    // Also prompt share
    try {
      await Share.share({
        message: `Join our home pantry on Nourish! Use invite code: ${household.invite_code}`,
        title: 'Join Nourish Pantry',
      });
    } catch {}
  };

  const handleShareCode = async () => {
    if (!household?.invite_code) return;
    hapticTap();
    try {
      await Share.share({
        message: `Join our home pantry on Nourish! Use invite code: ${household.invite_code}`,
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
      'Are you sure you want to leave this shared pantry? You will switch back to your private pantry list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const res = await leaveHousehold();
            if (res.success) {
              hapticSuccess();
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
      toast.show(
        modalMode === 'create' ? 'Please enter a household name' : 'Please enter an invite code',
        'info'
      );
      return;
    }

    setSubmitting(true);
    hapticTap();

    if (modalMode === 'create') {
      const res = await createHousehold(val);
      setSubmitting(false);
      if (res.success) {
        hapticSuccess();
        toast.show('Household created! Invite code generated.', 'success');
        setModalVisible(false);
      } else {
        toast.show(res.error || 'Failed to create household', 'error');
      }
    } else {
      const res = await joinHousehold(val);
      setSubmitting(false);
      if (res.success) {
        hapticSuccess();
        toast.show('Joined shared household pantry!', 'success');
        setModalVisible(false);
      } else {
        toast.show(res.error || 'Invalid or expired invite code', 'error');
      }
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      {/* ── Card Header ── */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(2, 51, 45, 0.1)' }]}>
          <Users size={20} color={palette.forestDeep} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={[styles.title, { color: colors.text }]}>Household Pantry</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>
            Shared inventory & multi-member sync
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
        <View style={{ paddingVertical: spacing[5], alignItems: 'center' }}>
          <ActivityIndicator color={palette.forestDeep} size="small" />
        </View>
      ) : household ? (
        /* ── Active Household State ── */
        <View style={{ marginTop: spacing[4], gap: 14 }}>
          {/* Active Household Info Box */}
          <View
            style={[
              styles.householdInfoBox,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <View style={styles.activeHouseRow}>
              <View style={{ flex: 1 }}>
                <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.8 }]}>
                  ACTIVE PANTRY
                </Text>
                <Text style={[type.h2, { color: colors.text, marginTop: 2 }]}>
                  {household.name}
                </Text>
              </View>
              <View style={[styles.liveSyncBadge, { backgroundColor: 'rgba(2, 51, 45, 0.08)' }]}>
                <View style={styles.pulseDot} />
                <Text style={[styles.liveSyncText, { color: palette.forestDeep }]}>Live Sync</Text>
              </View>
            </View>

            {/* Invite Code Display & Action Row */}
            <View style={[styles.codeContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.6, fontSize: 10 }]}>
                  INVITE CODE
                </Text>
                <Text style={[type.monoBold, { fontSize: 17, color: palette.forestDeep, letterSpacing: 1.5, marginTop: 2 }]}>
                  {household.invite_code}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleCopyCode}
                style={[styles.copyBtn, { backgroundColor: copiedCode ? palette.forestDeep : 'rgba(2, 51, 45, 0.08)' }]}
                activeOpacity={0.7}
                accessibilityLabel="Copy invite code"
              >
                {copiedCode ? (
                  <>
                    <Check size={14} color={palette.chalk} strokeWidth={2.5} />
                    <Text style={[styles.copyBtnText, { color: palette.chalk }]}>Copied</Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color={palette.forestDeep} strokeWidth={2.2} />
                    <Text style={[styles.copyBtnText, { color: palette.forestDeep }]}>Copy</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Household Members List */}
            <View style={{ marginTop: 12 }}>
              <Text style={[type.labelSm, { color: colors.subText, letterSpacing: 0.6, fontSize: 10, marginBottom: 8 }]}>
                HOUSEHOLD MEMBERS
              </Text>
              <View style={{ gap: 6 }}>
                {(household.members && household.members.length > 0
                  ? household.members
                  : [
                      {
                        id: 'you',
                        name: 'You',
                        role: 'owner' as const,
                        isYou: true,
                        joined_at: new Date().toISOString(),
                      },
                    ]
                ).map((member: HouseholdMember) => (
                  <View
                    key={member.id}
                    style={[styles.memberRow, { borderColor: colors.border }]}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: member.isYou ? palette.forestDeep : palette.mist2 }]}>
                      <Text style={[styles.avatarText, { color: member.isYou ? palette.chalk : colors.text }]}>
                        {member.name.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.name} {member.isYou ? '(You)' : ''}
                    </Text>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            member.role === 'owner' ? 'rgba(2, 51, 45, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: member.role === 'owner' ? palette.forestDeep : colors.subText },
                        ]}
                      >
                        {member.role === 'owner' ? 'ADMIN' : 'MEMBER'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Clean Non-Cluttered Action Row */}
          <View style={{ gap: 10 }}>
            <PrimaryAction
              label="Share Invite Link & Code"
              onPress={handleShareCode}
              icon={Share2}
              variant="sage"
            />
            <TouchableOpacity
              onPress={handleLeave}
              style={[styles.leaveBtn, { borderColor: palette.danger }]}
              accessibilityLabel="Leave household"
              activeOpacity={0.7}
            >
              <LogOut size={15} color={palette.danger} strokeWidth={2.2} />
              <Text style={[styles.leaveBtnText, { color: palette.danger }]}>
                Leave Household Pantry
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Empty State: Clean Uncluttered Layout ── */
        <View style={{ marginTop: spacing[3] }}>
          <Text style={[type.bodySm, { color: colors.subText, lineHeight: 19 }]}>
            Share inventory in real-time with family or flatmates to eliminate duplicate grocery
            trips and cut kitchen waste.
          </Text>

          {/* Clean Stacked Action Buttons — Zero Clutter */}
          <View style={{ marginTop: spacing[4], gap: 10 }}>
            <PrimaryAction
              label="Create Household"
              onPress={handleOpenCreate}
              icon={Plus}
              variant="sage"
            />
            <SecondaryAction
              label="Join with Invite Code"
              onPress={handleOpenJoin}
              icon={UserPlus}
            />
          </View>
        </View>
      )}

      {/* ── Create / Join Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={[
                    styles.modalCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <Text style={[type.h2, { color: colors.text }]}>
                      {modalMode === 'create' ? 'Create Household' : 'Join Household'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      accessibilityLabel="Close modal"
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <X size={20} color={colors.subText} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[type.bodySm, { color: colors.subText, marginBottom: 14 }]}>
                    {modalMode === 'create'
                      ? 'Name your shared home pantry (e.g. "Chatterjee Kitchen"). You will get an instant invite code to share.'
                      : 'Enter the invite code provided by your household admin (e.g. NOURISH-XXXX).'}
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
                    placeholder={modalMode === 'create' ? 'e.g. Chatterjee Kitchen' : 'NOURISH-XXXX'}
                    placeholderTextColor={colors.subText}
                    value={inputValue}
                    onChangeText={setInputValue}
                    autoCapitalize={modalMode === 'join' ? 'characters' : 'words'}
                    autoCorrect={false}
                    autoFocus
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                    <View style={{ flex: 1 }}>
                      <SecondaryAction label="Cancel" onPress={() => setModalVisible(false)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryAction
                        label={
                          submitting
                            ? 'Submitting...'
                            : modalMode === 'create'
                            ? 'Create'
                            : 'Join'
                        }
                        onPress={handleSubmit}
                        loading={submitting}
                        variant="sage"
                      />
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
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
    borderRadius: 14,
    padding: spacing[3],
  },
  activeHouseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveSyncText: {
    fontSize: 11,
    fontFamily: font.sansBold,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: font.sansBold,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11,
    fontFamily: font.sansBold,
  },
  memberName: {
    flex: 1,
    fontSize: 13,
    fontFamily: font.sansMed,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontFamily: font.monoBold,
    letterSpacing: 0.5,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderRadius: 12,
  },
  leaveBtnText: {
    fontFamily: font.sansBold,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: font.sansMed,
  },
});
