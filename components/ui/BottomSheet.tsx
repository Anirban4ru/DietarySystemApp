import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/components/ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  const slideIn = () => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  };

  const slideOut = () => {
    'worklet';
    opacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, (isFinished) => {
      if (isFinished) {
        runOnJS(onClose)();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      slideIn();
    }
  }, [visible]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 1000) {
        slideOut();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={slideOut}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={StyleSheet.absoluteFill}>
          <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <TouchableWithoutFeedback onPress={() => { slideOut(); }}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
            <GestureDetector gesture={pan}>
              <Reanimated.View style={[styles.sheet, { backgroundColor: colors.bg }, animatedStyle]}>
                <View style={styles.handle} />
                {children}
              </Reanimated.View>
            </GestureDetector>
          </Reanimated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    alignSelf: 'center',
    marginBottom: 16,
  },
});
