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
    // Only activate when there's very clear horizontal intent
    // Require at least 50px horizontal movement before activating
    .activeOffsetX([-50, 50])
    // Fail immediately if vertical movement exceeds 20px
    // This prioritizes vertical scrolling - fail early for vertical gestures
    .failOffsetY([-20, 20])
    .minPointers(1)
    .maxPointers(1)
    .onEnd((event) => {
      if (!enabled) return;

      const { translationX, translationY, velocityX, velocityY } = event;

      // Only trigger if horizontal movement is significantly greater than vertical
      // This ensures we don't interfere with vertical scrolling
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      const absVelX = Math.abs(velocityX);
      const absVelY = Math.abs(velocityY || 0);
      
      // Strict check: if there's any significant vertical movement, require horizontal to be at least 3x
      // This prevents interfering with vertical scrolling, especially at list edges
      if (absY > 15 && absX < absY * 3) {
        return; // Likely a vertical scroll, ignore
      }
      
      // Also check velocity - if vertical velocity is significant, ignore
      if (absVelY > 200 && absVelX < absVelY * 2) {
        return; // Likely a vertical scroll gesture, ignore
      }

      // Check if swipe meets threshold
      // velocityX is in pixels per second, so multiply threshold by 1000
      const minSwipeDistance = SWIPE_THRESHOLD;
      const minSwipeVelocity = SWIPE_VELOCITY_THRESHOLD * 1000;

      // Only trigger if we have clear horizontal intent
      // Require horizontal movement/velocity to be significantly greater than vertical
      if (
        (absX > minSwipeDistance && absX > absY * 2) ||
        (absVelX > minSwipeVelocity && absVelX > absVelY * 2)
      ) {
        if (translationX > 0 || velocityX > 0) {
          // Swipe right - previous day
          runOnJS(onSwipeRight)();
        } else {
          // Swipe left - next day
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
