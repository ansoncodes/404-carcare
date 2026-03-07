"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";

interface UseWebSocketOptions {
  path: string;
  onMessage?: (payload: unknown) => void;
  enabled?: boolean;
}

export function useWebSocket({ path, onMessage, enabled = true }: UseWebSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);

  const connect = useCallback(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const url = `${WS_URL}${path}${path.includes("?") ? "&" : "?"}token=${accessToken}`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
    };

    socket.onmessage = (event) => {
      if (!onMessage) {
        return;
      }
      try {
        const data: unknown = JSON.parse(event.data);
        onMessage(data);
      } catch {
        onMessage(event.data);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (!enabled) {
        return;
      }
      const attempt = retryRef.current + 1;
      retryRef.current = attempt;
      const wait = Math.min(1000 * attempt, 5000);
      timerRef.current = setTimeout(() => connect(), wait);
    };
  }, [accessToken, enabled, onMessage, path]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  return { connected, send };
}
