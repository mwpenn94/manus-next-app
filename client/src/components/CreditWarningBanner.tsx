/**
 * CreditWarningBanner — Persistent warning banner shown when credits are exhausted.
 *
 * Listens to a global event dispatched by the streaming error handler when a 412
 * "usage exhausted" error is received. Shows a dismissible amber banner at the top
 * of the task view. Persists across navigation until dismissed or credits are added.
 */
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

// Custom event name for credit exhaustion
export const CREDIT_EXHAUSTED_EVENT = "manus:credit-exhausted";
export const CREDIT_RESTORED_EVENT = "manus:credit-restored";

export function CreditWarningBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if previously flagged in this session
    const stored = sessionStorage.getItem("creditExhausted");
    if (stored === "true") setVisible(true);

    const handleExhausted = () => {
      sessionStorage.setItem("creditExhausted", "true");
      setVisible(true);
      setDismissed(false);
    };

    const handleRestored = () => {
      sessionStorage.removeItem("creditExhausted");
      setVisible(false);
    };

    window.addEventListener(CREDIT_EXHAUSTED_EVENT, handleExhausted);
    window.addEventListener(CREDIT_RESTORED_EVENT, handleRestored);
    return () => {
      window.removeEventListener(CREDIT_EXHAUSTED_EVENT, handleExhausted);
      window.removeEventListener(CREDIT_RESTORED_EVENT, handleRestored);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-amber-200 flex-1">
        <strong>Credits exhausted.</strong> Your account credits have been used up.
        Please add more credits to continue using the AI agent.
      </span>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors shrink-0"
        aria-label="Dismiss credit warning"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * Utility: dispatch the credit-exhausted event from anywhere.
 * Called by the streaming error handler when a 412 is detected.
 */
export function dispatchCreditExhausted() {
  window.dispatchEvent(new CustomEvent(CREDIT_EXHAUSTED_EVENT));
}

/**
 * Utility: dispatch the credit-restored event (e.g., after successful stream).
 */
export function dispatchCreditRestored() {
  window.dispatchEvent(new CustomEvent(CREDIT_RESTORED_EVENT));
}
