/**
 * useCrimsonHawk — WebSocket client hook for Crimson-Hawk local browser extension
 *
 * Crimson-Hawk is a browser extension that allows Manus Next to control
 * the user's local browser instead of the cloud browser. This hook manages:
 * - WebSocket connection to the local extension (default: ws://localhost:12700)
 * - Connection state (disconnected → connecting → handshaking → connected)
 * - Sending browser commands (navigate, click, type, screenshot)
 * - Receiving browser events (page loaded, screenshot captured, error)
 * - Auto-retry with exponential backoff
 */
import { useState, useCallback, useRef, useEffect } from "react";

export type CrimsonHawkStatus =
  | "disconnected"
  | "connecting"
  | "handshaking"
  | "connected"
  | "error";

export interface CrimsonHawkEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface BrowserCommand {
  type: "navigate" | "click" | "type" | "screenshot" | "scroll" | "evaluate" | "back" | "forward" | "refresh";
  payload: Record<string, unknown>;
}

export interface BrowserEvent {
  type: "page_loaded" | "screenshot" | "dom_update" | "console" | "error" | "auth_response";
  payload: Record<string, unknown>;
}

const DEFAULT_PORT = 12700;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export function useCrimsonHawk() {
  const [status, setStatus] = useState<CrimsonHawkStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<CrimsonHawkEvent | null>(null);
  const [events, setEvents] = useState<CrimsonHawkEvent[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portRef = useRef(DEFAULT_PORT);
  const eventHandlersRef = useRef<Set<(event: BrowserEvent) => void>>(new Set());

  const addEvent = useCallback((event: CrimsonHawkEvent) => {
    setLastEvent(event);
    setEvents((prev) => [...prev.slice(-99), event]);
  }, []);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnect");
      wsRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    retriesRef.current = 0;
    setStatus("disconnected");
    setScreenshotUrl(null);
    setCurrentUrl(null);
    setPageTitle(null);
  }, [cleanup]);

  const connectInternal = useCallback(
    (port: number) => {
      cleanup();
      setStatus("connecting");

      try {
        const ws = new WebSocket(`ws://localhost:${port}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("handshaking");
          // Send handshake to identify as Manus Next
          ws.send(
            JSON.stringify({
              type: "handshake",
              client: "manus-next",
              version: "1.0.0",
              capabilities: ["navigate", "click", "type", "screenshot", "scroll", "evaluate"],
            })
          );
          addEvent({
            type: "connection.open",
            payload: { port },
            timestamp: new Date(),
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle handshake response
            if (data.type === "auth_response" || data.type === "handshake_ack") {
              if (data.status === "ok" || data.accepted) {
                setStatus("connected");
                retriesRef.current = 0;
                addEvent({
                  type: "auth.success",
                  payload: data,
                  timestamp: new Date(),
                });
              } else {
                setStatus("error");
                addEvent({
                  type: "auth.failed",
                  payload: data,
                  timestamp: new Date(),
                });
              }
              return;
            }

            // Handle screenshot events
            if (data.type === "screenshot") {
              setScreenshotUrl(data.payload?.url || data.payload?.dataUrl || null);
            }

            // Handle page navigation events
            if (data.type === "page_loaded") {
              setCurrentUrl(data.payload?.url || null);
              setPageTitle(data.payload?.title || null);
            }

            // Dispatch to registered handlers
            eventHandlersRef.current.forEach((handler) => handler(data as BrowserEvent));

            addEvent({
              type: data.type,
              payload: data.payload || data,
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
            payload: { port },
            timestamp: new Date(),
          });
        };

        ws.onclose = (event) => {
          if (event.code !== 1000 && retriesRef.current < MAX_RETRIES) {
            // Auto-retry with exponential backoff
            const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
            retriesRef.current += 1;
            setStatus("connecting");
            addEvent({
              type: "connection.retrying",
              payload: { attempt: retriesRef.current, maxRetries: MAX_RETRIES, delayMs: delay },
              timestamp: new Date(),
            });
            retryTimeoutRef.current = setTimeout(() => connectInternal(port), delay);
          } else if (event.code !== 1000) {
            setStatus("error");
            addEvent({
              type: "connection.failed",
              payload: { reason: "Max retries exceeded" },
              timestamp: new Date(),
            });
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
    [cleanup, addEvent]
  );

  const connect = useCallback(
    (port: number = DEFAULT_PORT) => {
      portRef.current = port;
      retriesRef.current = 0;
      setEvents([]);
      connectInternal(port);
    },
    [connectInternal]
  );

  const checkConnection = useCallback(() => {
    // Retry connection with current port
    retriesRef.current = 0;
    connectInternal(portRef.current);
  }, [connectInternal]);

  const sendCommand = useCallback(
    (command: BrowserCommand) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(command));
        addEvent({
          type: `command.${command.type}`,
          payload: command.payload,
          timestamp: new Date(),
        });
        return true;
      }
      return false;
    },
    [addEvent]
  );

  const navigate = useCallback(
    (url: string) => sendCommand({ type: "navigate", payload: { url } }),
    [sendCommand]
  );

  const takeScreenshot = useCallback(
    () => sendCommand({ type: "screenshot", payload: {} }),
    [sendCommand]
  );

  const onBrowserEvent = useCallback(
    (handler: (event: BrowserEvent) => void) => {
      eventHandlersRef.current.add(handler);
      return () => {
        eventHandlersRef.current.delete(handler);
      };
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    lastEvent,
    events,
    screenshotUrl,
    currentUrl,
    pageTitle,
    connect,
    disconnect,
    checkConnection,
    sendCommand,
    navigate,
    takeScreenshot,
    onBrowserEvent,
    isConnected: status === "connected",
  };
}
