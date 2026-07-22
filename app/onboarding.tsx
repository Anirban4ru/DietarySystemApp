import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Animated, Easing as NativeEasing, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolation, interpolateColor } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Leaf, ShieldCheck, Zap, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { palette, type, spacing, font } from '@/lib/theme';
import { BrutalButton, useTheme } from '@/components/ui';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'AI Recipe\nGeneration',
    description: 'Generate recipes from what you have before ingredients expire.',
    icon: Zap,
    color: palette.amberDeep,
    bgLight: '#F5F0E6',
    bgDark: '#1A1811',
  },
  {
    id: '2',
    title: 'Personalized\nNutrition',
    description: 'Set your health conditions and get daily macro tracking automatically.',
    icon: ShieldCheck,
    color: palette.clayDeep,
    bgLight: '#F3ECE9',
    bgDark: '#1A1613',
  },
  {
    id: '3',
    title: 'Smart Pantry\nManagement',
    description: 'Track your groceries, get AI tips, and reduce food waste effortlessly.',
    icon: Leaf,
    color: palette.sageDeep,
    bgLight: '#ECF3EF',
    bgDark: '#131A15',
  },
];

export default function OnboardingScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<Reanimated.ScrollView>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const [loading, setLoading] = useState(false);
  const circleScale = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleMomentumScrollEnd = (event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    Animated.timing(circleScale, {
      toValue: 50,
      duration: 600,
      easing: NativeEasing.inOut(NativeEasing.ease),
      useNativeDriver: true,
    }).start();

    setTimeout(async () => {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/login');
    }, 500);
  };

  const animatedBgStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scrollX.value,
      SLIDES.map((_, i) => i * width),
      SLIDES.map((s) => (mode === 'dark' ? s.bgDark : s.bgLight))
    );
    return { backgroundColor };
  });

  return (
    <Reanimated.View style={[styles.container, animatedBgStyle]}>
      <TouchableOpacity 
        onPress={finishOnboarding} 
        style={[styles.skipButton, { top: insets.top + 10 }]}
      >
        <Text style={[styles.skipText, { color: colors.subText }]}>Skip</Text>
      </TouchableOpacity>

      <Reanimated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {SLIDES.map((slide, index) => {
          const Icon = slide.icon;

          const animatedIconStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const translateY = interpolate(scrollX.value, inputRange, [100, 0, 100], Extrapolation.CLAMP);
            const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
            return { transform: [{ translateY }, { scale }], opacity };
          });

          const animatedTextStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
            return { transform: [{ translateY }], opacity };
          });

          return (
            <View key={slide.id} style={styles.slide}>
              <Reanimated.View style={[styles.iconContainer, { backgroundColor: slide.color }, animatedIconStyle]}>
                <Icon size={72} color={palette.chalk} strokeWidth={1.5} />
              </Reanimated.View>
              <Reanimated.View style={[animatedTextStyle, { alignItems: 'center' }]}>
                <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: colors.subText }]}>{slide.description}</Text>
              </Reanimated.View>
            </View>
          );
        })}
      </Reanimated.ScrollView>

      {/* Pagination & CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
              const dotWidth = interpolate(scrollX.value, inputRange, [10, 24, 10], Extrapolation.CLAMP);
              const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
              const backgroundColor = interpolateColor(
                scrollX.value,
                SLIDES.map((_, i) => i * width),
                SLIDES.map((s) => s.color)
              );
              return { width: dotWidth, opacity, backgroundColor };
            });
            return <Reanimated.View key={index} style={[styles.dot, dotStyle]} />;
          })}
        </View>

        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: SLIDES[currentIndex].color }]}
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText]}>
            {currentIndex === SLIDES.length - 1 ? 'GET STARTED' : 'CONTINUE'}
          </Text>
          {currentIndex < SLIDES.length - 1 && <ArrowRight size={20} color={palette.chalk} strokeWidth={2.5} />}
        </TouchableOpacity>
      </View>

      {/* Expanding Transition Overlay */}
      <Animated.View
        pointerEvents={loading ? 'auto' : 'none'}
        style={[
          styles.transitionCircle,
          { transform: [{ scale: circleScale }] }
        ]}
      />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: font.sansBold,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    fontFamily: font.sans,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 32,
    height: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    gap: 8,
  },
  nextButtonText: {
    color: palette.chalk,
    fontFamily: font.sansBold,
    fontSize: 15,
    letterSpacing: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 100,
    padding: 10,
  },
  skipText: {
    fontFamily: font.sansBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  transitionCircle: {
    position: 'absolute',
    bottom: height * 0.1,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.sageDeep,
    zIndex: 1000,
  },
});
