import { useState, useEffect, useRef, useCallback } from 'react';

interface UseStreamingBufferOptions {
  targetRate?: number;
  bufferSize?: number;
  onFlush?: (text: string) => void;
}

const DEFAULT_TARGET_RATE = 30; // tokens per second
const DEFAULT_BUFFER_SIZE = 300; // tokens
const AUTO_FLUSH_TIMEOUT = 300; // ms

export const useStreamingBuffer = (options: UseStreamingBufferOptions = {}) => {
  const {
    targetRate = DEFAULT_TARGET_RATE,
    bufferSize = DEFAULT_BUFFER_SIZE,
    onFlush,
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [bufferedText, setBufferedText] = useState('');
  const [tokensPerSecond, setTokensPerSecond] = useState(0);

  const bufferRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastTokenCountRef = useRef<number>(0);
  const lastRateCalcTimeRef = useRef<number>(0);
  const autoFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFlushRef = useRef(onFlush);

  useEffect(() => {
    onFlushRef.current = onFlush;
  }, [onFlush]);

  const flush = useCallback(() => {
    if (bufferRef.current.length > 0) {
      const flushedContent = bufferRef.current;
      setDisplayedText((prev) => prev + flushedContent);
      bufferRef.current = '';
      setBufferedText('');
      onFlushRef.current?.(flushedContent);
    }
    if (autoFlushTimeoutRef.current) {
      clearTimeout(autoFlushTimeoutRef.current);
    }
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
      lastRateCalcTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    let currentRate = targetRate;
    const bufferLength = bufferRef.current.length;

    // Backpressure handling
    if (bufferLength > bufferSize) {
      const pressureFactor = Math.min(2, bufferLength / bufferSize);
      currentRate *= pressureFactor;
    }

    const charsToDisplay = Math.ceil((currentRate * deltaTime) / 1000);
    const chunk = bufferRef.current.slice(0, charsToDisplay);

    if (chunk.length > 0) {
      setDisplayedText((prev) => prev + chunk);
      bufferRef.current = bufferRef.current.slice(chunk.length);
      setBufferedText(bufferRef.current);
    }

    // Calculate tokens per second
    const rateCalcDeltaTime = timestamp - lastRateCalcTimeRef.current;
    if (rateCalcDeltaTime > 500) {
      const currentDisplayedLength = bufferRef.current.length;
      const tokensDisplayed = currentDisplayedLength - lastTokenCountRef.current;
      const currentTps = (Math.abs(tokensDisplayed) / rateCalcDeltaTime) * 1000;
      setTokensPerSecond(currentTps);
      lastTokenCountRef.current = currentDisplayedLength;
      lastRateCalcTimeRef.current = timestamp;
    }

    if (bufferRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animationFrameRef.current = null;
      lastFrameTimeRef.current = 0;
      setTokensPerSecond(0);
      setBufferedText('');
    }
  }, [targetRate, bufferSize]);

  const push = useCallback((tokens: string) => {
    if (!tokens) return;

    bufferRef.current += tokens;
    setBufferedText(bufferRef.current);

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    if (autoFlushTimeoutRef.current) {
      clearTimeout(autoFlushTimeoutRef.current);
    }

    autoFlushTimeoutRef.current = setTimeout(() => {
      flush();
    }, AUTO_FLUSH_TIMEOUT);

  }, [animate, flush]);

  const reset = useCallback(() => {
    flush();
    setDisplayedText('');
    setBufferedText('');
    setTokensPerSecond(0);
    bufferRef.current = '';
    lastFrameTimeRef.current = 0;
    lastTokenCountRef.current = 0;
    lastRateCalcTimeRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (autoFlushTimeoutRef.current) {
      clearTimeout(autoFlushTimeoutRef.current);
    }
  }, [flush]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (autoFlushTimeoutRef.current) {
        clearTimeout(autoFlushTimeoutRef.current);
      }
    };
  }, []);

  return {
    push,
    flush,
    reset,
    bufferedText,
    displayedText,
    isBuffering: bufferedText.length > 0,
    tokensPerSecond,
  };
};
