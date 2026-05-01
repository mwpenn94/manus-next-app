/**
 * @file useInputHistory.ts
 * @description A React hook for navigating through a command history with arrow keys,
 * similar to a shell interface. It manages the position within the history and
 * calls a callback function to update the input field with the recalled command.
 */

import { useState, useCallback } from 'react';

/**
 * Props for the useInputHistory hook.
 */
interface UseInputHistoryProps {
  /** The list of past commands. */
  history: string[];
  /** The current value of the input field, before any recall. */
  currentInput: string;
  /** Callback function to update the parent component's input state. */
  onRecall: (text: string) => void;
}

/**
 * The return value of the useInputHistory hook.
 */
interface UseInputHistoryReturn {
  /** 
   * A keydown event handler to be attached to an input element.
   * Intercepts ArrowUp and ArrowDown keys to navigate history.
   */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** The current index in the history array. -1 represents the current, un-recalled input. */
  historyIndex: number;
}

/**
 * A React hook that provides shell-style arrow-up/down message recall for an input field.
 *
 * @param {UseInputHistoryProps} props - The props for the hook.
 * @returns {UseInputHistoryReturn} An object containing the keydown handler and the current history index.
 */
const useInputHistory = ({
  history,
  currentInput,
  onRecall,
}: UseInputHistoryProps): UseInputHistoryReturn => {
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (history.length === 0) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        if (newIndex !== historyIndex) {
          setHistoryIndex(newIndex);
          onRecall(history[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex === -1) {
          return; // Already at the bottom (current input), do nothing
        }

        if (historyIndex === history.length - 1) {
          // We are at the last item and pressing down again, so return to current input
          setHistoryIndex(-1);
          onRecall(currentInput);
        } else {
          const newIndex = Math.min(history.length - 1, historyIndex + 1);
          setHistoryIndex(newIndex);
          onRecall(history[newIndex]);
        }
      }
    },
    [history, historyIndex, currentInput, onRecall]
  );

  return { handleKeyDown, historyIndex };
};

export default useInputHistory;
