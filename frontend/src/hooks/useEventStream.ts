import { useEffect, useRef, useState } from "react";
import type { Job } from "../lib/api";
const EVENTS_URL = `${import.meta.env.VITE_API_URL ?? "/api"}/events`;

export function useEventStream(onJobUpdate: (job: Job) => void) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onJobUpdate);

  useEffect(() => {
    callbackRef.current = onJobUpdate;
  }, [onJobUpdate]);

  useEffect(() => {
    const source = new EventSource(EVENTS_URL);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data?.type === "connected") return;
      callbackRef.current(data as Job);
    };

    return () => source.close();
  }, []);

  return { connected };
}
