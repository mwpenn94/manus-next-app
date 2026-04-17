/**
 * BridgeContext — Sovereign Bridge WebSocket Connection Manager
 *
 * Manages a WebSocket connection to the Sovereign Bridge server,
 * providing real-time status, message dispatch, and event handling.
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

export type BridgeStatus = "disconnected" | "connecting" | "connected" | "error";

export interface BridgeEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

interface BridgeContextValue {
  status: BridgeStatus;
  lastEvent: BridgeEvent | null;
  events: BridgeEvent[];
  connect: (url: string, apiKey?: string) => void;
  disconnect: () => void;
  send: (type: string, payload: unknown) => void;
  latencyMs: number | null;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

const MAX_EVENTS = 100;

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BridgeStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<BridgeEvent | null>(null);
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved config and auto-connect if enabled
  const bridgeConfigQuery = trpc.bridge.getConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const addEvent = useCallback((event: BridgeEvent) => {
    setLastEvent(event);
    setEvents((prev) => [...prev.slice(-MAX_EVENTS + 1), event]);
  }, []);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnect");
      wsRef.current = null;
    }
    setStatus("disconnected");
    setLatencyMs(null);
  }, []);

  const connect = useCallback(
    (url: string, apiKey?: string) => {
      disconnect();
      setStatus("connecting");

      try {
        const wsUrl = new URL(url);
        if (apiKey) {
          wsUrl.searchParams.set("apiKey", apiKey);
        }

        const ws = new WebSocket(wsUrl.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("connected");
          addEvent({
            type: "connection.open",
            payload: { url },
            timestamp: new Date(),
          });

          // Start ping interval for latency measurement
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              pingTimestampRef.current = Date.now();
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "pong") {
              setLatencyMs(Date.now() - pingTimestampRef.current);
              return;
            }

            addEvent({
              type: data.type || "message",
              payload: data,
              timestamp: new Date(),
            });
          } catch {
            addEvent({
              type: "raw",
              payload: event.data,
              timestamp: new Date(),
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
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          if (event.code !== 1000) {
            setStatus("error");
            addEvent({
              type: "connection.closed",
              payload: { code: event.code, reason: event.reason },
              timestamp: new Date(),
            });

            // Auto-reconnect after 5 seconds for non-intentional disconnects
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(url, apiKey);
            }, 5000);
          } else {
            setStatus("disconnected");
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
    [disconnect, addEvent]
  );

  const send = useCallback(
    (type: string, payload: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, payload }));
      }
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
      value={{ status, lastEvent, events, connect, disconnect, send, latencyMs }}
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
