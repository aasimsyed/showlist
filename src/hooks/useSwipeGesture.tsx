import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from '../utils/constants';
import { runOnJS } from 'react-native-reanimated';

interface UseSwipeGestureProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  enabled,
}: UseSwipeGestureProps) {
  const panGesture = Gesture.Pan()
    .enabled(enabled)
    // Activate sooner (36px) so we register before vertical drift accumulates
    .activeOffsetX([-36, 36])
    // Fail on small vertical movement so list scroll wins and doesn't get stuck
    .failOffsetY([-25, 25])
    .minPointers(1)
    .maxPointers(1)
    .onEnd((event) => {
      if (!enabled) return;

      const { translationX, translationY, velocityX, velocityY } = event;

      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      const absVelX = Math.abs(velocityX);
      const absVelY = Math.abs(velocityY || 0);

      // Ignore only when vertical is clearly dominant (horizontal < vertical)
      if (absY > 20 && absX < absY) {
        return;
      }
      if (absVelY > 250 && absVelX < absVelY) {
        return;
      }

      const minSwipeDistance = SWIPE_THRESHOLD;
      const minSwipeVelocity = SWIPE_VELOCITY_THRESHOLD * 1000;

      // Trigger when horizontal is dominant (>= 1.3x vertical) and meets distance/velocity
      const horizontalDominant = absX >= absY * 1.3 || absVelX >= (absVelY || 1) * 1.3;
      const meetsThreshold =
        (absX > minSwipeDistance && horizontalDominant) ||
        (absVelX > minSwipeVelocity && horizontalDominant);

      if (meetsThreshold) {
        if (translationX > 0 || velocityX > 0) {
          runOnJS(onSwipeRight)();
        } else {
          runOnJS(onSwipeLeft)();
        }
      }
    });

  return panGesture;
}

// Export a component wrapper for easier use
export const SwipeableContainer: React.FC<{
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
}> = ({ children, onSwipeLeft, onSwipeRight, enabled }) => {
  const gesture = useSwipeGesture({ onSwipeLeft, onSwipeRight, enabled });

  return (
    <GestureDetector gesture={gesture}>
      {children}
    </GestureDetector>
  );
};

// Export the gesture for use with simultaneousHandlers if needed
export function getSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  enabled,
}: UseSwipeGestureProps) {
  return useSwipeGesture({ onSwipeLeft, onSwipeRight, enabled });
}
