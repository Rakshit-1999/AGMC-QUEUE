import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Content width of an element, kept current with a ResizeObserver.
 * Charts draw at the real pixel width so text and strokes stay at their DESIGN sizes
 * instead of being scaled by a viewBox.
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.clientWidth));
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
