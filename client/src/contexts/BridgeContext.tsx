/**
 * BridgeContext — Sovereign Bridge WebSocket Connection Manager
 *
 * Enhanced with:
 * - Exponential backoff reconnection (max 5 retries)
 * - Heartbeat ping/pong with latency measurement
 * - Auth token handshake on connect
 * - Structured message protocol (task:start, task:step, task:complete, task:error)
 * - Connection quality indicator (latency, reconnect count, uptime)
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";

export type BridgeStatus = "disconnected" | "connecting" | "connected" | "authenticating" | "error";

export interface BridgeEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  direction?: "inbound" | "outbound";
}

// Structured message protocol types
export interface BridgeTaskStart {
  type: "task:start";
  taskId: string;
  prompt: string;
  attachments?: string[];
}

export interface BridgeTaskStep {
  type: "task:step";
  taskId: string;
  stepIndex: number;
  totalSteps: number;
  action: string;
  status: "active" | "done" | "error";
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface BridgeTaskComplete {
  type: "task:complete";
  taskId: string;
  result: string;
  artifacts?: Array<{ type: string; url: string; name: string }>;
}

export interface BridgeTaskError {
  type: "task:error";
  taskId: string;
  error: string;
  code?: string;
  recoverable?: boolean;
}

export type BridgeMessage =
  | BridgeTaskStart
  | BridgeTaskStep
  | BridgeTaskComplete
  | BridgeTaskError
  | { type: string; [key: string]: unknown };

export interface ConnectionQuality {
  latencyMs: number | null;
  reconnectCount: number;
  uptimeMs: number;
  lastPingAt: Date | null;
  messagesSent: number;
  messagesReceived: number;
}

interface BridgeContextValue {
  status: BridgeStatus;
  lastEvent: BridgeEvent | null;
  events: BridgeEvent[];
  quality: ConnectionQuality;
  connect: (url: string, apiKey?: string) => void;
  disconnect: () => void;
  send: (message: BridgeMessage) => void;
  sendRaw: (type: string, payload: unknown) => void;
  startTask: (taskId: string, prompt: string, attachments?: string[]) => void;
  cancelTask: (taskId: string) => void;
  onTaskEvent: (handler: (event: BridgeMessage) => void) => () => void;
  clearEvents: () => void;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

const MAX_EVENTS = 200;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 15000;

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BridgeStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<BridgeEvent | null>(null);
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const [quality, setQuality] = useState<ConnectionQuality>({
    latencyMs: null,
    reconnectCount: 0,
    uptimeMs: 0,
    lastPingAt: null,
    messagesSent: 0,
    messagesReceived: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uptimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const connectedAtRef = useRef<number>(0);
  const urlRef = useRef<string>("");
  const apiKeyRef = useRef<string | undefined>(undefined);
  const taskEventHandlersRef = useRef<Set<(event: BridgeMessage) => void>>(new Set());

  // Load saved config for auto-connect
  const bridgeConfigQuery = trpc.bridge.getConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const addEvent = useCallback((event: BridgeEvent) => {
    setLastEvent(event);
    setEvents((prev) => [...prev.slice(-MAX_EVENTS + 1), event]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const stopUptimeTracker = useCallback(() => {
    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
      uptimeIntervalRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    stopHeartbeat();
    stopUptimeTracker();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnect");
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setStatus("disconnected");
    setQuality((prev) => ({ ...prev, latencyMs: null, uptimeMs: 0 }));
  }, [stopHeartbeat, stopUptimeTracker]);

  const startHeartbeat = useCallback(
    (ws: WebSocket) => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingTimestampRef.current = Date.now();
          ws.send(JSON.stringify({ type: "ping", ts: pingTimestampRef.current }));
          setQuality((prev) => ({
            ...prev,
            lastPingAt: new Date(),
            messagesSent: prev.messagesSent + 1,
          }));
        }
      }, HEARTBEAT_INTERVAL);
    },
    [stopHeartbeat]
  );

  const startUptimeTracker = useCallback(() => {
    stopUptimeTracker();
    connectedAtRef.current = Date.now();
    uptimeIntervalRef.current = setInterval(() => {
      setQuality((prev) => ({
        ...prev,
        uptimeMs: Date.now() - connectedAtRef.current,
      }));
    }, 1000);
  }, [stopUptimeTracker]);

  const scheduleReconnect = useCallback(
    (url: string, apiKey?: string) => {
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus("error");
        addEvent({
          type: "connection.max_retries",
          payload: { attempts: reconnectAttemptsRef.current },
          timestamp: new Date(),
        });
        return;
      }

      const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
      reconnectAttemptsRef.current += 1;

      addEvent({
        type: "connection.reconnecting",
        payload: {
          attempt: reconnectAttemptsRef.current,
          maxAttempts: MAX_RECONNECT_ATTEMPTS,
          delayMs: delay,
        },
        timestamp: new Date(),
      });

      reconnectTimeoutRef.current = setTimeout(() => {
        setQuality((prev) => ({
          ...prev,
          reconnectCount: prev.reconnectCount + 1,
        }));
        connectInternal(url, apiKey);
      }, delay);
    },
    [addEvent]
  );

  const connectInternal = useCallback(
    (url: string, apiKey?: string) => {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      stopHeartbeat();
      stopUptimeTracker();

      setStatus("connecting");

      try {
        const wsUrl = new URL(url);
        if (apiKey) {
          wsUrl.searchParams.set("apiKey", apiKey);
        }

        const ws = new WebSocket(wsUrl.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          // Send auth handshake
          setStatus("authenticating");
          ws.send(
            JSON.stringify({
              type: "auth:handshake",
              payload: {
                client: "manus-next",
                version: "1.0.0",
                apiKey: apiKey || undefined,
                capabilities: [
                  "task:start",
                  "task:step",
                  "task:complete",
                  "task:error",
                  "file:upload",
                  "stream:sse",
                ],
              },
            })
          );

          addEvent({
            type: "connection.open",
            payload: { url },
            timestamp: new Date(),
            direction: "inbound",
          });

          // After handshake sent, mark as connected
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              setStatus("connected");
              reconnectAttemptsRef.current = 0;
              startHeartbeat(ws);
              startUptimeTracker();
            }
          }, 500);
        };

        ws.onmessage = (event) => {
          setQuality((prev) => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
          }));

          try {
            const data = JSON.parse(event.data);

            // Handle pong for latency measurement
            if (data.type === "pong") {
              const latency = Date.now() - (data.ts || pingTimestampRef.current);
              setQuality((prev) => ({ ...prev, latencyMs: latency }));
              return;
            }

            // Handle auth response
            if (data.type === "auth:response") {
              if (data.status === "ok") {
                setStatus("connected");
                reconnectAttemptsRef.current = 0;
              } else {
                setStatus("error");
                addEvent({
                  type: "auth.failed",
                  payload: data,
                  timestamp: new Date(),
                  direction: "inbound",
                });
              }
              return;
            }

            // Structured task events — dispatch to handlers
            if (
              data.type === "task:start" ||
              data.type === "task:step" ||
              data.type === "task:complete" ||
              data.type === "task:error"
            ) {
              taskEventHandlersRef.current.forEach((handler) => handler(data));
            }

            addEvent({
              type: data.type || "message",
              payload: data,
              timestamp: new Date(),
              direction: "inbound",
            });
          } catch {
            addEvent({
              type: "raw",
              payload: event.data,
              timestamp: new Date(),
              direction: "inbound",
            });
          }
        };

        ws.onerror = () => {
          setStatus("error");
          addEvent({
            type: "connection.error",
            payload: { url },
            timestamp: new Date(),
          });
        };

        ws.onclose = (event) => {
          stopHeartbeat();
          stopUptimeTracker();

          if (event.code !== 1000) {
            // Non-intentional close — attempt reconnect with backoff
            setStatus("error");
            addEvent({
              type: "connection.closed",
              payload: { code: event.code, reason: event.reason },
              timestamp: new Date(),
            });
            scheduleReconnect(url, apiKey);
          } else {
            setStatus("disconnected");
            reconnectAttemptsRef.current = 0;
          }
        };
      } catch (err) {
        setStatus("error");
        addEvent({
          type: "connection.error",
          payload: { error: String(err) },
          timestamp: new Date(),
        });
      }
    },
    [addEvent, stopHeartbeat, stopUptimeTracker, startHeartbeat, startUptimeTracker, scheduleReconnect]
  );

  const connect = useCallback(
    (url: string, apiKey?: string) => {
      urlRef.current = url;
      apiKeyRef.current = apiKey;
      reconnectAttemptsRef.current = 0;
      setQuality({
        latencyMs: null,
        reconnectCount: 0,
        uptimeMs: 0,
        lastPingAt: null,
        messagesSent: 0,
        messagesReceived: 0,
      });
      connectInternal(url, apiKey);
    },
    [connectInternal]
  );

  const send = useCallback(
    (message: BridgeMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        setQuality((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
        }));
        addEvent({
          type: message.type,
          payload: message,
          timestamp: new Date(),
          direction: "outbound",
        });
      }
    },
    [addEvent]
  );

  const sendRaw = useCallback(
    (type: string, payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, payload }));
        setQuality((prev) => ({
          ...prev,
          messagesSent: prev.messagesSent + 1,
        }));
      }
    },
    []
  );

  const startTask = useCallback(
    (taskId: string, prompt: string, attachments?: string[]) => {
      send({
        type: "task:start",
        taskId,
        prompt,
        attachments,
      });
    },
    [send]
  );

  const cancelTask = useCallback(
    (taskId: string) => {
      sendRaw("task:cancel", { taskId });
    },
    [sendRaw]
  );

  const onTaskEvent = useCallback(
    (handler: (event: BridgeMessage) => void) => {
      taskEventHandlersRef.current.add(handler);
      return () => {
        taskEventHandlersRef.current.delete(handler);
      };
    },
    []
  );

  // Auto-connect if bridge config is saved and enabled
  useEffect(() => {
    const config = bridgeConfigQuery.data;
    if (config && config.enabled && config.bridgeUrl && status === "disconnected") {
      connect(config.bridgeUrl, config.apiKey ?? undefined);
    }
  }, [bridgeConfigQuery.data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <BridgeContext.Provider
      value={{
        status,
        lastEvent,
        events,
        quality,
        connect,
        disconnect,
        send,
        sendRaw,
        startTask,
        cancelTask,
        onTaskEvent,
        clearEvents,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error("useBridge must be used within BridgeProvider");
  return ctx;
}
