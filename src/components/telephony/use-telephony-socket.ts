import { useEffect, useRef, useState } from "react";
import { getTelephonyWebSocketUrl } from "./telephony-service";

export type TelephonySocketStatus = "idle" | "connecting" | "connected" | "reconnecting";

export function useTelephonySocket<T>({
  path,
  query,
  enabled = true,
  onMessage,
}: {
  path: string;
  query?: Record<string, string> | undefined;
  enabled?: boolean;
  onMessage: (message: T) => void;
}) {
  const [status, setStatus] = useState<TelephonySocketStatus>(enabled ? "connecting" : "idle");
  const messageHandler = useRef(onMessage);
  const queryString = new URLSearchParams(query ?? {}).toString();

  useEffect(() => {
    messageHandler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (!active) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");

      try {
        const queryParams = new URLSearchParams(queryString);
        const url = getTelephonyWebSocketUrl(path, queryParams);
        socket = new WebSocket(url);

        socket.onopen = () => {
          if (!active) return;
          attempt = 0;
          setStatus("connected");
        };

        socket.onmessage = (event) => {
          if (!active || typeof event.data !== "string") return;
          try {
            messageHandler.current(JSON.parse(event.data) as T);
          } catch {
            // Ignore malformed or non-JSON frames and keep the live connection available.
          }
        };

        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (!active) return;
          setStatus("reconnecting");
          const delay = Math.min(1000 * 2 ** attempt, 15_000);
          attempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        };
      } catch {
        if (!active) return;
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** attempt, 15_000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      }
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, path, queryString]);

  return { status };
}