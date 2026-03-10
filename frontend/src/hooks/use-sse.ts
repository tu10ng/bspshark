"use client";

import { useCallback, useRef, useState } from "react";

interface UseSSEOptions {
  onMessage?: (data: string) => void;
  onError?: (error: Event) => void;
  onComplete?: () => void;
}

interface UseSSEReturn {
  output: string;
  isRunning: boolean;
  start: (url: string) => void;
  stop: () => void;
}

export function useSSE(options?: UseSSEOptions): UseSSEReturn {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(
    (url: string) => {
      stop();
      setOutput("");
      setIsRunning(true);

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        setOutput((prev) => prev + event.data + "\n");
        options?.onMessage?.(event.data);
      };

      es.onerror = (event) => {
        // EventSource auto-reconnects on error; close on final error
        if (es.readyState === EventSource.CLOSED) {
          setIsRunning(false);
          options?.onComplete?.();
        }
        options?.onError?.(event);
      };

      es.addEventListener("complete", () => {
        es.close();
        eventSourceRef.current = null;
        setIsRunning(false);
        options?.onComplete?.();
      });
    },
    [stop, options]
  );

  return { output, isRunning, start, stop };
}
