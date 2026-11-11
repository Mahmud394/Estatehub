import { useEffect, useRef } from 'react';

// Calls `callback` every `ms` milliseconds while the browser tab is visible, and once more
// when the tab becomes visible again. Used for the notification bell and open chat threads,
// so we get "live enough" updates without WebSockets (simple to build and to explain).
export function usePolling(callback, ms, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => { if (!document.hidden) saved.current(); };
    const id = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
}
