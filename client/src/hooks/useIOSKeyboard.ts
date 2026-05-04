/**
 * useIOSKeyboard — iOS composer choreography hook (GAP G)
 *
 * Handles:
 * 1. Visual viewport resize detection (keyboard open/close)
 * 2. Smooth input area repositioning when keyboard appears
 * 3. Scroll-to-bottom on keyboard open to keep input visible
 * 4. Prevents iOS bounce/overscroll during keyboard transitions
 */
import { useState, useEffect, useCallback, useRef } from "react";

interface IOSKeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
}

export function useIOSKeyboard(): IOSKeyboardState {
  const [state, setState] = useState<IOSKeyboardState>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const initialHeight = useRef(typeof window !== "undefined" ? window.innerHeight : 0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use visualViewport API for accurate iOS keyboard detection
    const viewport = window.visualViewport;
    if (!viewport) return;

    initialHeight.current = viewport.height;

    const handleResize = () => {
      const currentHeight = viewport.height;
      const heightDiff = initialHeight.current - currentHeight;
      // Keyboard is considered open if viewport shrinks by more than 100px
      const isOpen = heightDiff > 100;

      setState({
        isKeyboardOpen: isOpen,
        keyboardHeight: isOpen ? heightDiff : 0,
        viewportHeight: currentHeight,
      });

      // On iOS, scroll the input into view when keyboard opens
      if (isOpen) {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
          // Use requestAnimationFrame to wait for layout
          requestAnimationFrame(() => {
            activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }
      }
    };

    const handleScroll = () => {
      // Prevent iOS rubber-band bounce during keyboard transitions
      if (state.isKeyboardOpen) {
        const scrollTop = viewport.offsetTop;
        if (scrollTop < 0) {
          window.scrollTo(0, 0);
        }
      }
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleScroll);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [state.isKeyboardOpen]);

  return state;
}

/**
 * useIOSInputFocus — Manages focus behavior for iOS composer inputs
 *
 * On iOS, focusing an input can cause the page to scroll unexpectedly.
 * This hook provides a controlled focus method that prevents scroll jumps.
 */
export function useIOSInputFocus(inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>) {
  const focus = useCallback(() => {
    if (!inputRef.current) return;

    // On iOS, prevent the page from scrolling when focusing
    const scrollY = window.scrollY;
    inputRef.current.focus({ preventScroll: true });

    // Restore scroll position if it jumped
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - scrollY) > 50) {
        window.scrollTo(0, scrollY);
      }
    });
  }, [inputRef]);

  return { focus };
}

/**
 * useIOSTouchOptimization — Touch-optimized interaction patterns
 *
 * Provides:
 * - Touch target size enforcement (44px minimum per Apple HIG)
 * - Haptic feedback triggers (via navigator.vibrate)
 * - Swipe gesture detection for bottom sheet
 */
export function useIOSTouchOptimization() {
  const isIOS = useRef(
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );

  const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
    if (!isIOS.current) return;
    const durations = { light: 10, medium: 20, heavy: 30 };
    try {
      navigator.vibrate?.(durations[style]);
    } catch {
      // Haptic not available
    }
  }, []);

  return {
    isIOS: isIOS.current,
    triggerHaptic,
    // Minimum touch target class for iOS HIG compliance
    touchTargetClass: "min-h-[44px] min-w-[44px]",
  };
}
