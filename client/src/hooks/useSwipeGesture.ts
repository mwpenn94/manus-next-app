import { useRef, useEffect } from 'react';

/**
 * @name useSwipeGesture
 * @description A React hook to detect horizontal swipe gestures on a touch-enabled element.
 * @param {object} options - The options for the swipe gesture.
 * @param {() => void} options.onSwipeLeft - Callback function to be executed on a left swipe.
 * @param {() => void} options.onSwipeRight - Callback function to be executed on a right swipe.
 * @param {number} [options.threshold=50] - The minimum swipe distance in pixels to trigger a swipe.
 * @returns {React.RefObject<HTMLElement>} A ref to be attached to the swipeable element.
 */

interface SwipeGestureOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
}

const useSwipeGesture = <T extends HTMLElement>({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeGestureOptions) => {
  const elementRef = useRef<T>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) {
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX.current;

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight();
        } else {
          onSwipeLeft();
        }
      }

      touchStartX.current = null;
    };

    if (element) {
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return elementRef;
};

export default useSwipeGesture;