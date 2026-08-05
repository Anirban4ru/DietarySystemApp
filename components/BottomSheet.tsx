import { useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from './ui';
import { palette, spacing } from '@/lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}

export function BottomSheet({ children, visible, onClose }: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const context = useSharedValue({ y: 0 });

  const scrollTo = (destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, { damping: 20, stiffness: 150 }, () => {
      if (destination === SCREEN_HEIGHT) {
        runOnJS(onClose)();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      scrollTo(0);
    } else if (translateY.value === 0) {
      // Allow parent to unmount/close manually
      scrollTo(SCREEN_HEIGHT);
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(event.translationY + context.value.y, 0);
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 1000) {
        scrollTo(SCREEN_HEIGHT);
      } else {
        scrollTo(0);
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return { transform: [{ translateY: translateY.value }] };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateY.value,
        [0, SCREEN_HEIGHT / 2],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  if (!visible && translateY.value === SCREEN_HEIGHT) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => scrollTo(SCREEN_HEIGHT)}>
      <TouchableWithoutFeedback onPress={() => scrollTo(SCREEN_HEIGHT)}>
        <Animated.View style={[styles.backdrop, rBackdropStyle]} />
      </TouchableWithoutFeedback>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.bottomSheetContainer, { backgroundColor: colors.bg }, rBottomSheetStyle]}>
          <View style={styles.line} />
          {children}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[5],
    paddingBottom: 40,
    paddingTop: 12,
  },
  line: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.mist2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
});
