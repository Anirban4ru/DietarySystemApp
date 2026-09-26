import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, User, Target, Leaf, Heart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticTap, hapticSuccess, hapticSelection } from '@/lib/haptics';
import { palette, spacing, font, type } from '@/lib/theme';
import { useTheme } from '@/components/ui';
import { useProfile } from '@/lib/hooks';
import { Condition } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');

type Step = 'welcome' | 'personal' | 'goals' | 'done';

const GOALS = [
  { id: 'reduce_waste', label: 'Reduce Food Waste', icon: Leaf },
  { id: 'eat_healthy', label: 'Eat Healthier', icon: Heart },
  { id: 'save_money', label: 'Save Money on Groceries', icon: Target },
  { id: 'track_nutrition', label: 'Track Nutrition', icon: User },
];

const CONDITIONS: { id: Condition; label: string }[] = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hypertension', label: 'Hypertension / BP' },
  { id: 'celiac', label: 'Celiac / Gluten-Free' },
  { id: 'lactose_intolerant', label: 'Lactose Intolerant' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { upsert } = useProfile();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';

  const animateNext = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_W,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(SCREEN_W);
      callback();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleWelcomeNext = () => {
    hapticSelection();
    animateNext(() => setStep('personal'));
  };

  const handlePersonalNext = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }
    hapticSelection();
    animateNext(() => setStep('goals'));
  };

  const handleFinish = async () => {
    hapticSuccess();
    setSaving(true);
    try {
      await upsert({
        name: name.trim(),
        age: parseInt(age) || 25,
        sex,
        weight_kg: parseFloat(weight) || 70,
        height_cm: parseFloat(height) || 170,
        activity_level: 'moderate',
        conditions: selectedConditions,
      });
      await AsyncStorage.setItem('@nourish_onboarding_done', 'true');
      animateNext(() => setStep('done'));
    } catch (e) {
      setSaving(false);
    }
  };

  const handleDone = () => {
    hapticTap();
    router.replace('/(tabs)');
  };

  const toggleGoal = (id: string) => {
    hapticSelection();
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleCondition = (id: Condition) => {
    hapticSelection();
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const stepIndex = ['welcome', 'personal', 'goals', 'done'].indexOf(step);

  return (
    <View style={[styles.container, { backgroundColor: palette.sageDeep }]}>
      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Progress dots */}
      {step !== 'done' && (
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= stepIndex ? palette.chalk : 'rgba(255,255,255,0.25)' },
              ]}
            />
          ))}
        </View>
      )}

      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'welcome' && (
            <View style={styles.stepContent}>
              <View style={styles.iconCircle}>
                <Leaf size={40} color={palette.chalk} strokeWidth={2} />
              </View>
              <Text style={styles.headline}>Namaste!</Text>
              <Text style={styles.subline}>
                {"Welcome to Nourish. Let's set up your personal health profile."}
              </Text>
              <Text style={styles.bulletItem}>Your data belongs only to you and remains strictly private.</Text>
              <Text style={styles.bulletItem}>Recipes tailored to Indian cuisine and fresh pantry ingredients.</Text>
              <Text style={styles.bulletItem}>Track pantry shelf-life, eliminate waste, and optimize nutrition.</Text>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleWelcomeNext}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>{"LET'S GET STARTED"}</Text>
                <ChevronRight size={18} color={palette.sageDeep} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}

          {step === 'personal' && (
            <View style={styles.stepContent}>
              <Text style={styles.headline}>About You</Text>
              <Text style={styles.subline}>
                Used to personalize recipes and nutrition targets. Nothing is shared.
              </Text>

              <Text style={styles.fieldLabel}>YOUR NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>AGE</Text>
                  <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>WEIGHT (KG)</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>HEIGHT (CM)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>GENDER</Text>
              <View style={styles.sexRow}>
                {(['male', 'female'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sexChip,
                      sex === s && { backgroundColor: palette.chalk },
                    ]}
                    onPress={() => { hapticSelection(); setSex(s); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sexChipText, sex === s && { color: palette.sageDeep }]}>
                      {s === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handlePersonalNext}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>NEXT</Text>
                <ChevronRight size={18} color={palette.sageDeep} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}

          {step === 'goals' && (
            <View style={styles.stepContent}>
              <Text style={styles.headline}>Your Goals</Text>
              <Text style={styles.subline}>
                What do you want from Nourish? Select all that apply.
              </Text>

              <Text style={styles.sectionLabel}>I WANT TO</Text>
              {GOALS.map(({ id, label, icon: Icon }) => {
                const active = selectedGoals.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => toggleGoal(id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.optionIcon, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Icon size={18} color={palette.chalk} strokeWidth={2} />
                    </View>
                    <Text style={styles.optionLabel}>{label}</Text>
                    {active && <Check size={18} color={palette.chalk} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.sectionLabel, { marginTop: spacing[6] }]}>HEALTH CONDITIONS (OPTIONAL)</Text>
              <View style={styles.conditionGrid}>
                {CONDITIONS.map(({ id, label }) => {
                  const active = selectedConditions.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.conditionChip, active && styles.conditionChipActive]}
                      onPress={() => toggleCondition(id)}
                      activeOpacity={0.8}
                    >
                      {active && <Check size={12} color={palette.sageDeep} strokeWidth={3} style={{ marginRight: 4 }} />}
                      <Text style={[styles.conditionText, active && { color: palette.sageDeep }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
                onPress={handleFinish}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>{saving ? 'SAVING...' : 'START MY JOURNEY'}</Text>
                <ChevronRight size={18} color={palette.sageDeep} strokeWidth={2.5} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  AsyncStorage.setItem('@nourish_onboarding_done', 'true');
                  router.replace('/(tabs)');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'done' && (
            <View style={[styles.stepContent, { alignItems: 'center' }]}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: spacing[6] }]}>
                <Check size={48} color={palette.chalk} strokeWidth={2.5} />
              </View>
              <Text style={[styles.headline, { textAlign: 'center' }]}>
                Namaste, {name || 'there'}!
              </Text>
              <Text style={[styles.subline, { textAlign: 'center' }]}>
                Your profile is all set. Your pantry is preloaded with Indian kitchen staples to get you started.
              </Text>
              <Text style={[styles.subline, { textAlign: 'center', opacity: 0.7, fontSize: 13 }]}>
                Everything is private — only you can see your data.
              </Text>

              <TouchableOpacity
                style={[styles.btnPrimary, { marginTop: spacing[8] }]}
                onPress={handleDone}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>OPEN NOURISH</Text>
                <ChevronRight size={18} color={palette.sageDeep} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -180,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 56,
    paddingBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingBottom: 60,
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing[6],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
    alignSelf: 'center',
  },
  headline: {
    fontFamily: font.sansBold,
    fontSize: 32,
    color: palette.chalk,
    letterSpacing: -0.5,
    marginBottom: spacing[3],
  },
  subline: {
    fontFamily: font.sans,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 23,
    marginBottom: spacing[5],
  },
  bulletItem: {
    fontFamily: font.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: spacing[2],
    paddingLeft: spacing[2],
  },
  fieldLabel: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  sectionLabel: {
    fontFamily: font.sansBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: spacing[3],
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: spacing[4],
    fontFamily: font.sans,
    fontSize: 16,
    color: palette.chalk,
    marginBottom: spacing[1],
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  sexRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  sexChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexChipText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: palette.chalk,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing[2],
  },
  optionRowActive: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.chalk,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  conditionChipActive: {
    backgroundColor: palette.chalk,
    borderColor: palette.chalk,
  },
  conditionText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: palette.chalk,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: palette.chalk,
    marginTop: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: palette.sageDeep,
    letterSpacing: 1.5,
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
  },
  skipText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
});
