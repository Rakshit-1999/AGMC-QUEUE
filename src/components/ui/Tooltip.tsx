import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: string;
  /** A single focusable element (button, link…). It receives aria-describedby. */
  children: ReactElement;
  placement?: 'top' | 'bottom';
  /** Stretch the anchor to full width (for full-width buttons). */
  block?: boolean;
}

const HOVER_DELAY_MS = 400;
const GAP = 6;

/**
 * Dark tooltip (DESIGN §1.22): 400 ms on hover, immediately on focus, Esc dismisses.
 * The child is wrapped in an inline anchor span so the child's own ref is never replaced.
 */
export function Tooltip({ content, children, placement = 'top', block = false }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const clear = () => window.clearTimeout(timer.current);
  const show = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    if (delay === 0) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delay);
  }, []);
  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
  }, []);

  useEffect(() => clear, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
    };
  }, [open, hide]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const a = anchorRef.current?.getBoundingClientRect();
    const tip = tipRef.current;
    if (!a || !tip) return;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let top = placement === 'top' ? a.top - GAP - h : a.bottom + GAP;
    if (placement === 'top' && top < 4) top = a.bottom + GAP;
    const left = Math.min(Math.max(4, a.left + a.width / 2 - w / 2), window.innerWidth - w - 4);
    setPos({ top, left });
  }, [open, placement, content]);

  const child = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, { 'aria-describedby': open ? id : undefined })
    : children;

  return (
    <>
      <span
        ref={anchorRef}
        className={block ? styles.anchorBlock : styles.anchor}
        onPointerEnter={() => show(HOVER_DELAY_MS)}
        onPointerLeave={hide}
        onFocus={() => show(0)}
        onBlur={hide}
      >
        {child}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className={styles.tooltip}
            style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
            data-lenis-prevent
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
