import { useState, useEffect, useCallback } from 'react';

/**
 * @typedef {object} OfflineMessage
 * @property {string} id - A unique identifier for the message.
 * @property {string} content - The content of the message.
 * @property {number} timestamp - The timestamp when the message was queued.
 */
interface OfflineMessage {
  id: string;
  content: string;
  timestamp: number;
}

/**
 * A React hook to manage a queue of messages when the application is offline.
 * It tracks the online/offline status and provides functions to add messages to a queue
 * and flush the queue when the connection is restored.
 *
 * @returns {{isOffline: boolean, queueLength: number, addToQueue: (content: string) => void, flush: () => OfflineMessage[]}}
 */
const useOfflineQueue = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queue, setQueue] = useState<OfflineMessage[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = useCallback((content: string) => {
    if (isOffline) {
      const newMessage: OfflineMessage = {
        id: crypto.randomUUID(),
        content,
        timestamp: Date.now(),
      };
      setQueue((prevQueue) => [...prevQueue, newMessage]);
    }
  }, [isOffline]);

  const flush = useCallback(() => {
    const messages = [...queue];
    setQueue([]);
    return messages;
  }, [queue]);

  return {
    isOffline,
    queueLength: queue.length,
    addToQueue,
    flush,
  };
};

export default useOfflineQueue;
