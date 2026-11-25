import { useEffect, useState, useRef, useCallback } from 'react';
import { ConnectionStatus, Task } from '../types/Task';

interface UseSSEOptions {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (payload: { id: string; status?: string }) => void;
}

export function useSSE({ onTaskCreated, onTaskUpdated, onTaskDeleted }: UseSSEOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  // Keep latest callbacks in refs to prevent reconnecting on callback change
  const callbacksRef = useRef({ onTaskCreated, onTaskUpdated, onTaskDeleted });
  callbacksRef.current = { onTaskCreated, onTaskUpdated, onTaskDeleted };

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const sseUrl = `${API_BASE}/api/events`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;
      };

      es.addEventListener('CONNECTED', () => {
        setConnectionStatus('connected');
      });

      es.addEventListener('TASK_CREATED', (e: MessageEvent) => {
        try {
          const task: Task = JSON.parse(e.data);
          callbacksRef.current.onTaskCreated?.(task);
        } catch (err) {
          console.error('[SSE] Failed to parse TASK_CREATED:', err);
        }
      });

      es.addEventListener('TASK_UPDATED', (e: MessageEvent) => {
        try {
          const task: Task = JSON.parse(e.data);
          callbacksRef.current.onTaskUpdated?.(task);
        } catch (err) {
          console.error('[SSE] Failed to parse TASK_UPDATED:', err);
        }
      });

      es.addEventListener('TASK_DELETED', (e: MessageEvent) => {
        try {
          const payload: { id: string; status?: string } = JSON.parse(e.data);
          callbacksRef.current.onTaskDeleted?.(payload);
        } catch (err) {
          console.error('[SSE] Failed to parse TASK_DELETED:', err);
        }
      });

      es.onerror = () => {
        setConnectionStatus('disconnected');
        es.close();

        // Exponential backoff reconnect: 1s, 2s, 4s, max 10s
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
        reconnectAttemptRef.current += 1;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };
    } catch (err) {
      console.error('[SSE] Initialization error:', err);
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  return { connectionStatus, reconnect };
}
