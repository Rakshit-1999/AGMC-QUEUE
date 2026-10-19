import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

export interface BandProps {
  ref(el: HTMLButtonElement | null): void;
  tabIndex: number;
  onPointerEnter(): void;
  onPointerLeave(): void;
  onFocus(): void;
  onBlur(): void;
  onKeyDown(e: KeyboardEvent<HTMLButtonElement>): void;
}

/**
 * Hover and keyboard state for chart bands (DESIGN §2.5 "Hover").
 * One tab stop per chart (roving tabindex); arrow keys, Home and End move between bands; Esc hides the tooltip.
 */
export function useChartHover(count: number): { active: number | null; bandProps(i: number): BandProps } {
  const [active, setActive] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = Math.min(focusIdx, Math.max(0, count - 1));

  const moveTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      setFocusIdx(next);
      refs.current[next]?.focus();
    },
    [count],
  );

  const bandProps = (i: number): BandProps => ({
    ref: (el) => {
      refs.current[i] = el;
    },
    tabIndex: i === tabStop ? 0 : -1,
    onPointerEnter: () => setActive(i),
    onPointerLeave: () => setActive((cur) => (cur === i ? null : cur)),
    onFocus: () => {
      setFocusIdx(i);
      setActive(i);
    },
    onBlur: () => setActive((cur) => (cur === i ? null : cur)),
    onKeyDown: (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          moveTo(i + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          moveTo(i - 1);
          break;
        case 'Home':
          e.preventDefault();
          moveTo(0);
          break;
        case 'End':
          e.preventDefault();
          moveTo(count - 1);
          break;
        case 'Escape':
          setActive(null);
          break;
        default:
          break;
      }
    },
  });

  return { active, bandProps };
}
