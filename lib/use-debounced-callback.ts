import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (!pendingArgsRef.current) return;
    const args = pendingArgsRef.current;
    pendingArgsRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    callbackRef.current(...args);
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      pendingArgsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pendingArgsRef.current = null;
        timerRef.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );

  useEffect(() => cancel, [cancel]);

  return { debounced, flush, cancel };
}
