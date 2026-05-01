import { useState, useEffect, useCallback } from 'react';

const INTERRUPTED_TASK_KEY_PREFIX = 'task_interrupted_';
const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

interface InterruptedTaskInfo {
  timestamp: number;
  status: string;
  lastMessageId: string;
}

export const markTaskInterrupted = (taskId: string, status: string, lastMessageId: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const data: InterruptedTaskInfo = {
      timestamp: Date.now(),
      status,
      lastMessageId,
    };
    localStorage.setItem(`${INTERRUPTED_TASK_KEY_PREFIX}${taskId}`, JSON.stringify(data));
  }
};

const clearInterruptedTask = (taskId: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(`${INTERRUPTED_TASK_KEY_PREFIX}${taskId}`);
  }
};

interface UseTaskContinuationOptions {
  taskId: string;
  lastStatus: string;
  onResume: () => void;
  onDismiss: () => void;
}

export const useTaskContinuation = ({
  taskId,
  lastStatus,
  onResume,
  onDismiss,
}: UseTaskContinuationOptions) => {
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [interruptedAt, setInterruptedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const key = `${INTERRUPTED_TASK_KEY_PREFIX}${taskId}`;
    const storedData = localStorage.getItem(key);

    if (storedData) {
      try {
        const parsedData: InterruptedTaskInfo = JSON.parse(storedData);
        const now = Date.now();
        if (now - parsedData.timestamp < THIRTY_MINUTES_IN_MS) {
          setShowResumePrompt(true);
          setInterruptedAt(new Date(parsedData.timestamp));
        } else {
          clearInterruptedTask(taskId);
        }
      } catch (error) {
        console.error('Failed to parse interrupted task data:', error);
        clearInterruptedTask(taskId);
      }
    }
  }, [taskId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastStatus === 'running' || lastStatus === 'streaming') {
        const lastMessageId = 'placeholder_message_id';
        markTaskInterrupted(taskId, lastStatus, lastMessageId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [taskId, lastStatus]);

  const dismiss = useCallback(() => {
    setShowResumePrompt(false);
    clearInterruptedTask(taskId);
    onDismiss();
  }, [taskId, onDismiss]);

  const resume = useCallback(() => {
    setShowResumePrompt(false);
    clearInterruptedTask(taskId);
    onResume();
  }, [taskId, onResume]);

  return {
    showResumePrompt,
    interruptedAt,
    dismiss,
    resume,
  };
};