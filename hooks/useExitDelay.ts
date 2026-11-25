"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lets a sheet play its exit before the parent unmounts it.
 * requestClose() sets `closing` and calls onClose after `ms`; reopen() cancels
 * (a tap during the close brings the sheet back). Reduced motion closes at once.
 * Focus goes back to the element that was focused when the sheet mounted.
 */
export function useExitDelay(onClose: () => void, ms = 200) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const requestClose = useCallback(() => {
    if (timer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onCloseRef.current();
    setClosing(true);
    timer.current = setTimeout(() => onCloseRef.current(), ms);
  }, [ms]);

  const reopen = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setClosing(false);
  }, []);

  return { closing, requestClose, reopen };
}
