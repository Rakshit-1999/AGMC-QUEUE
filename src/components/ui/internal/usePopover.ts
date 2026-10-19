import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface PopoverPosition {
  top: number;
  left: number;
  minWidth: number;
  placement: 'bottom' | 'top';
}

interface Options {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  popRef: RefObject<HTMLElement | null>;
  align: 'start' | 'end';
  offset?: number;
  matchWidth?: boolean;
}

const VIEWPORT_PAD = 8;

/**
 * Fixed-position popover anchored to a trigger (used by RowMenu and Select).
 * Opens below, flips above when it would leave the viewport, closes on outside
 * pointer-down, page scroll and resize. Escape handling stays with the caller so
 * it can return focus to the trigger.
 */
export function usePopover({ open, onClose, triggerRef, popRef, align, offset = 4, matchWidth = false }: Options) {
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger) return;
    const t = trigger.getBoundingClientRect();
    const popH = pop?.offsetHeight ?? 0;
    const popW = Math.max(pop?.offsetWidth ?? 0, matchWidth ? t.width : 0);
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const fitsBelow = t.bottom + offset + popH <= vh - VIEWPORT_PAD;
    const fitsAbove = t.top - offset - popH >= VIEWPORT_PAD;
    const placement: 'bottom' | 'top' = !fitsBelow && fitsAbove ? 'top' : 'bottom';
    const top = placement === 'bottom' ? t.bottom + offset : t.top - offset - popH;
    let left = align === 'end' ? t.right - popW : t.left;
    left = Math.min(Math.max(VIEWPORT_PAD, left), vw - popW - VIEWPORT_PAD);
    setPos({ top, left, minWidth: matchWidth ? t.width : 0, placement });
  }, [align, matchWidth, offset, popRef, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    measure();
    // Measure again once the popover has rendered and has a real size.
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    };
    const onScroll = (e: Event) => {
      // Scrolling inside the popover itself (long option lists) must not close it.
      if (e.target instanceof Node && popRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose, popRef, triggerRef]);

  return pos;
}
