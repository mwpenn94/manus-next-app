import { useState, useEffect, useRef, useCallback } from 'react';

// --- Type Definitions ---

type EventBusOptions = {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number; // in ms
};

type EventHandler = (data: unknown) => void;

type Subscription = {
  [event: string]: Set<EventHandler>;
};

type BufferedEvent = {
  event: string;
  data: unknown;
};

type LastEvent = {
  type: string;
  data: unknown;
  timestamp: number;
};

const DEFAULT_URL = 'ws://localhost:8080';
const DEFAULT_RECONNECT_INTERVAL = 1000; // 1s
const MAX_RECONNECT_INTERVAL = 30000; // 30s
const HEARTBEAT_INTERVAL = 30000; // 30s
const MAX_BUFFERED_EVENTS = 50;

// --- The Hook ---

export const useEventBus = (options: EventBusOptions = {}) => {
  const {
    url = DEFAULT_URL,
    autoConnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
  } = options;

  // --- State ---

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // --- Refs for mutable, non-rendering state ---

  const ws = useRef<WebSocket | null>(null);
  const subscribers = useRef<Subscription>({});
  const eventBuffer = useRef<BufferedEvent[]>([]);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const isUnmounted = useRef(false);

  // --- Core Connection Logic ---

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Clean up previous connection attempts
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    ws.current = new WebSocket(url);
    setConnectionAttempts(prev => prev + 1);

    ws.current.onopen = () => {
      if (isUnmounted.current) return;
      console.log('WebSocket connection established.');
      setIsConnected(true);
      setConnectionAttempts(0);

      // Flush buffered events
      eventBuffer.current.forEach(({ event, data }) => {
        publish(event, data);
      });
      eventBuffer.current = [];

      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.current.onmessage = (event) => {
      if (isUnmounted.current) return;
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (type === 'pong') return; // Ignore heartbeat responses

        setLastEvent({ type, data, timestamp: Date.now() });

        if (subscribers.current[type]) {
          subscribers.current[type].forEach(handler => handler(data));
        }
      } catch (error) {
        console.error('Failed to parse incoming WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      if (isUnmounted.current) return;
      console.error('WebSocket error:', error);
      // onclose will be called next, handling reconnect logic
    };

    ws.current.onclose = () => {
      if (isUnmounted.current) return;
      console.log('WebSocket connection closed.');
      setIsConnected(false);

      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      }

      if (autoConnect) {
        const delay = Math.min(
          MAX_RECONNECT_INTERVAL,
          reconnectInterval * Math.pow(2, connectionAttempts)
        );
        console.log(`Attempting to reconnect in ${delay}ms...`);
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };
  }, [url, autoConnect, reconnectInterval, connectionAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  // --- Public API ---

  const subscribe = useCallback((event: string, handler: EventHandler): (() => void) => {
    if (!subscribers.current[event]) {
      subscribers.current[event] = new Set();
    }
    subscribers.current[event].add(handler);

    // Return cleanup function
    return () => {
      if (subscribers.current[event]) {
        subscribers.current[event].delete(handler);
        if (subscribers.current[event].size === 0) {
          delete subscribers.current[event];
        }
      }
    };
  }, []);

  const publish = useCallback((event: string, data: unknown) => {
    const payload = JSON.stringify({ type: event, data });

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(payload);
    } else {
      if (eventBuffer.current.length < MAX_BUFFERED_EVENTS) {
        eventBuffer.current.push({ event, data });
      } else {
        console.warn('Event buffer is full. Dropping event:', { event, data });
      }
    }
  }, []);

  // --- Lifecycle ---

  useEffect(() => {
    isUnmounted.current = false;
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      isUnmounted.current = true;
      disconnect();
      subscribers.current = {}; // Clear all subscriptions
      eventBuffer.current = [];
      console.log('useEventBus unmounted and cleaned up.');
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    subscribe,
    publish,
    connect,
    disconnect,
    lastEvent,
    connectionAttempts,
  };
};
