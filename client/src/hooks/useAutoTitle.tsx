
import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface UseAutoTitleProps {
  taskId: string;
  /** The first response from the assistant, which may be streaming. */
  firstResponse: string;
  /** The current title of the task. */
  currentTitle: string;
  /** A boolean indicating if the response is currently streaming. */
  isStreaming: boolean;
}

const DEBOUNCE_DELAY = 1000; // ms

/**
 * A React hook that automatically generates a more descriptive task title
 * once the initial assistant response has finished streaming.
 *
 * It triggers a tRPC mutation to update the title if the initial title
 * appears to be a simple truncation of the user's input (heuristic: ends with '...').
 * This is debounced to prevent multiple calls during streaming.
 */
export const useAutoTitle = ({
  taskId,
  firstResponse,
  currentTitle,
  isStreaming,
}: UseAutoTitleProps) => {
  const updateTitleMutation = trpc.task.rename.useMutation();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false); // Prevents re-triggering for the same task session

  useEffect(() => {
    // Clear any existing timer if the stream is active or inputs change
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Conditions for triggering the title generation:
    // 1. The response is no longer streaming.
    // 2. We have a first response to work with.
    // 3. The current title looks like a truncated placeholder.
    // 4. We haven't already triggered this for the current hook instance.
    const canTrigger = !isStreaming && firstResponse && currentTitle.endsWith('...');

    if (canTrigger && !hasTriggeredRef.current) {
      debounceTimeoutRef.current = setTimeout(() => {
        if (hasTriggeredRef.current) return; // Final check before mutation

        hasTriggeredRef.current = true; // Mark as triggered
        updateTitleMutation.mutate({
          externalId: taskId,
          title: firstResponse.slice(0, 100).replace(/[\n\r]+/g, ' ').trim(),
        });
      }, DEBOUNCE_DELAY);
    }

    // Cleanup timeout on component unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [taskId, firstResponse, currentTitle, isStreaming, updateTitleMutation]);

  // This hook performs a side effect (mutation) and does not need to return a value.
  // The UI will update reactively based on the data change from the mutation.
};
