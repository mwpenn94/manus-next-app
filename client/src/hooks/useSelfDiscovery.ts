/**
 * useSelfDiscovery — Continuous Self-Discovery & Contextual Querying
 *
 * After a task's agent response completes and the user remains idle for a
 * configurable period, this hook auto-triggers a follow-up query that delves
 * deeper into the topic for further education, exploration, or application.
 *
 * Behavior:
 * - Watches for streaming completion (streaming → false)
 * - Starts an idle timer (default: 90 seconds)
 * - If user interacts (types, clicks send, navigates), timer resets
 * - After idle period, generates a contextual follow-up prompt
 * - Respects user preference (selfDiscovery toggle in Settings)
 * - Limits occurrences per task (default: 1, configurable)
 * - Shows a dismissible notification before auto-sending
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface SelfDiscoveryOptions {
  /** Whether self-discovery is enabled (from user preferences) */
  enabled: boolean;
  /** Whether the agent is currently streaming */
  streaming: boolean;
  /** The last assistant message content (to generate contextual follow-up) */
  lastAssistantContent: string | null;
  /** The original user query that started this task */
  originalQuery: string | null;
  /** Callback to send a follow-up message */
  onSendFollowUp: (message: string) => void;
  /** Max number of self-discovery triggers per task (default: 1) */
  maxOccurrences?: number;
  /** Idle time in seconds before triggering (default: 90) */
  idleSeconds?: number;
}

interface SelfDiscoveryState {
  /** Whether a self-discovery prompt is pending (showing notification) */
  pending: boolean;
  /** The generated follow-up prompt */
  pendingPrompt: string | null;
  /** Number of times self-discovery has triggered in this task */
  occurrences: number;
  /** Dismiss the pending notification */
  dismiss: () => void;
  /** Accept and send the pending prompt */
  accept: () => void;
  /** Seconds remaining until auto-send (countdown) */
  countdown: number;
}

const FOLLOW_UP_TEMPLATES = [
  "Can you go deeper on the most important aspect of what you just shared? What are the practical implications or next steps?",
  "What are the potential challenges or counterarguments to what you described? How would you address them?",
  "How does this connect to broader trends or related topics? What else should I explore?",
  "What would be the most impactful way to apply this knowledge? Give me a concrete action plan.",
  "What are the edge cases or nuances that most people miss about this topic?",
];

export function useSelfDiscovery(options: SelfDiscoveryOptions): SelfDiscoveryState {
  const {
    enabled,
    streaming,
    lastAssistantContent,
    originalQuery,
    onSendFollowUp,
    maxOccurrences = 1,
    idleSeconds = 90,
  } = options;

  const [pending, setPending] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState(0);
  const [countdown, setCountdown] = useState(0);
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasStreamingRef = useRef(false);
  const userActivityRef = useRef(false);

  // Generate a contextual follow-up based on the conversation
  const generateFollowUp = useCallback((): string => {
    // Pick a template based on content characteristics
    const content = lastAssistantContent || "";
    const query = originalQuery || "";
    
    // If the response mentioned steps/actions, ask about challenges
    if (content.includes("step") || content.includes("action") || content.includes("plan")) {
      return FOLLOW_UP_TEMPLATES[1]; // challenges/counterarguments
    }
    // If it was a research/analysis response, ask about connections
    if (content.includes("research") || content.includes("analysis") || content.includes("data")) {
      return FOLLOW_UP_TEMPLATES[2]; // broader trends
    }
    // If it was educational, ask about application
    if (query.toLowerCase().includes("explain") || query.toLowerCase().includes("what is") || query.toLowerCase().includes("how does")) {
      return FOLLOW_UP_TEMPLATES[3]; // action plan
    }
    // Default: go deeper
    return FOLLOW_UP_TEMPLATES[0];
  }, [lastAssistantContent, originalQuery]);

  // Reset user activity flag on interaction
  const resetActivity = useCallback(() => {
    userActivityRef.current = true;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (pending) {
      // User interacted while notification showing — dismiss
      setPending(false);
      setPendingPrompt(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
  }, [pending]);

  // Listen for user activity
  useEffect(() => {
    if (!enabled) return;
    
    const handlers = ["keydown", "mousedown", "touchstart", "scroll"];
    const handler = () => { userActivityRef.current = true; resetActivity(); };
    
    handlers.forEach(evt => window.addEventListener(evt, handler, { passive: true }));
    return () => {
      handlers.forEach(evt => window.removeEventListener(evt, handler));
    };
  }, [enabled, resetActivity]);

  // Watch for streaming completion → start idle timer
  useEffect(() => {
    if (!enabled || occurrences >= maxOccurrences) return;

    // Detect transition: streaming → not streaming
    if (wasStreamingRef.current && !streaming) {
      // Streaming just completed — start idle timer
      userActivityRef.current = false;
      
      idleTimerRef.current = setTimeout(() => {
        // Check if user was active during the idle period
        if (userActivityRef.current) return;
        
        // Generate and show the follow-up prompt
        const prompt = generateFollowUp();
        setPendingPrompt(prompt);
        setPending(true);
        setCountdown(15); // 15 second countdown before auto-send
        
        // Start countdown
        countdownTimerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              // Auto-send
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              setPending(false);
              setPendingPrompt(null);
              setOccurrences(o => o + 1);
              onSendFollowUp(prompt);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, idleSeconds * 1000);
    }

    wasStreamingRef.current = streaming;

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [streaming, enabled, occurrences, maxOccurrences, idleSeconds, generateFollowUp, onSendFollowUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    setPending(false);
    setPendingPrompt(null);
    setOccurrences(o => o + 1); // Count as used even if dismissed
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const accept = useCallback(() => {
    if (pendingPrompt) {
      onSendFollowUp(pendingPrompt);
      setOccurrences(o => o + 1);
    }
    setPending(false);
    setPendingPrompt(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, [pendingPrompt, onSendFollowUp]);

  return {
    pending,
    pendingPrompt,
    occurrences,
    dismiss,
    accept,
    countdown,
  };
}
