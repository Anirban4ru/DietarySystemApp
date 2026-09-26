import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Leaf, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { PressScale, useToast } from '@/components/ui';
import { spacing, font } from '@/lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { show } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!password || !confirmPassword) {
      show('Please fill in both password fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      show('Passwords do not match. Please re-enter.', 'error');
      return;
    }

    // Password policy: min 8 characters, at least 1 letter and 1 number
    if (password.length < 8) {
      show('Password must be at least 8 characters long.', 'error');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      show('Password must contain at least one letter and one number.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        show(error.message, 'error');
        setLoading(false);
        return;
      }

      show('Password updated successfully! Welcome to your workspace.', 'success');
      setLoading(false);
      router.replace('/(tabs)');
    } catch (err: any) {
      show(err.message || 'Failed to update password. Please request a new recovery link.', 'error');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Crest Header */}
        <View style={styles.header}>
          <View style={styles.crestWrap}>
            <View style={styles.crestInner}>
              <Leaf size={32} color="#BF9861" fill="#BF9861" strokeWidth={1} />
            </View>
          </View>
          <Text style={styles.brandTitle}>NOURISH</Text>
          <Text style={styles.brandSubtitle}>INTELLIGENT DIETARY SYSTEMS</Text>
          <Text style={styles.brandDescription}>
            Set a new secure password for your culinary intelligence workspace.
          </Text>
        </View>

        {/* ── LUXURY FORM CARD ── */}
        <View style={styles.formCard}>
          {/* New Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Lock size={13} color="#02332D" />
              <Text style={styles.fieldLabel}>NEW PASSWORD * (MIN 8 CHARS, 1 LETTER &amp; 1 NUMBER)</Text>
            </View>
            <View style={styles.passwordInputWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="Enter new password"
                placeholderTextColor="#8A7E72"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={19} color="#594E42" />
                ) : (
                  <Eye size={19} color="#594E42" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Lock size={13} color="#02332D" />
              <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD *</Text>
            </View>
            <View style={styles.passwordInputWrap}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholder="Re-enter new password"
                placeholderTextColor="#8A7E72"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} color="#594E42" />
                ) : (
                  <Eye size={19} color="#594E42" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Reset Button */}
          <PressScale
            onPress={handleResetPassword}
            disabled={loading}
            style={[styles.primaryBtn, { marginTop: spacing[4] }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#DACFBD" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.primaryBtnText}>
                  UPDATE PASSWORD &amp; ENTER
                </Text>
                <ArrowRight size={16} color="#DACFBD" strokeWidth={2.5} />
              </View>
            )}
          </PressScale>

          {/* Return to Login */}
          <TouchableOpacity
            onPress={() => router.replace('/login')}
            style={styles.cancelBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>CANCEL &amp; RETURN TO SIGN IN</Text>
          </TouchableOpacity>

          {/* Security Guarantee Note */}
          <View style={styles.guaranteeRow}>
            <ShieldCheck size={14} color="#02332D" />
            <Text style={styles.guaranteeText}>
              All credentials are cryptographically protected and hashed on transmission.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#DACFBD',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 64,
    paddingBottom: 80,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  crestWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#02332D',
    borderWidth: 2,
    borderColor: '#BF9861',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    shadowColor: '#02332D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  crestInner: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(191, 152, 97, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(218, 207, 189, 0.35)',
  },
  brandTitle: {
    fontFamily: font.display,
    fontSize: 28,
    color: '#02332D',
    letterSpacing: 6,
    fontWeight: '700' as any,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: '#594E42',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  brandDescription: {
    fontFamily: font.sans,
    fontSize: 13,
    color: '#594E42',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
    lineHeight: 18,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F7F3EB',
    borderRadius: 24,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(2, 51, 45, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  fieldGroup: {
    marginBottom: spacing[4],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: '#2C261F',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  passwordInputWrap: {
    position: 'relative',
    width: '100%',
    height: 52,
    justifyContent: 'center',
  },
  passwordInput: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 51, 45, 0.12)',
    backgroundColor: '#FFFFFF',
    paddingLeft: 16,
    paddingRight: 48,
    fontFamily: font.sans,
    fontSize: 15,
    color: '#0D1C1A',
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#02332D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#02332D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: font.sansBold,
    fontSize: 12,
    color: '#DACFBD',
    letterSpacing: 1.5,
  },
  cancelBtn: {
    marginTop: spacing[4],
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: font.sansBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#594E42',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing[5],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(2, 51, 45, 0.08)',
  },
  guaranteeText: {
    fontFamily: font.sans,
    fontSize: 11,
    color: '#594E42',
    textAlign: 'center',
    flex: 1,
  },
});
