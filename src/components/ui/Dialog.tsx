import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import { cx } from './internal/cx';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /** Escape, backdrop click, and the safe (Back / Cancel) button. */
  onClose(): void;
  title: string;
  /** Short grey explanation under the title. */
  description?: ReactNode;
  /** default = 440 px · wide = 640 px (DESIGN §1.7). */
  width?: 'default' | 'wide';
  /** Fields. */
  children?: ReactNode;
  /** Bottom-right buttons; safe choice first (quiet "Back"/"Cancel"), action last. */
  actions: ReactNode;
  /** Element to focus on open. Defaults to the first field, else the first footer button (the safe choice). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** When set, the body + footer become a <form>; give the action button type="submit" so Enter submits. */
  onSubmit?(): void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELD = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([disabled]), [role="radio"][tabindex="0"], [data-autofocus]';

export function Dialog({ open, onClose, title, description, width = 'default', children, actions, initialFocus, onSubmit }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion() ?? false;
  const lenis = useLenis();

  // Remember the trigger, lock page scroll, restore focus on close.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Lenis locks the page while stopped; without Lenis (e.g. /display) fall back to overflow hidden.
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    if (lenis) lenis.stop();
    else html.style.overflow = 'hidden';
    return () => {
      if (lenis) lenis.start();
      else html.style.overflow = prevOverflow;
      const el = returnFocusRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open, lenis]);

  // Initial focus once the panel is mounted.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const target =
        initialFocus?.current ??
        bodyRef.current?.querySelector<HTMLElement>(FIELD) ??
        footerRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        panelRef.current;
      target?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, initialFocus]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.();
  };

  const t = reduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };
  const tOut = reduced ? { duration: 0 } : { duration: 0.15, ease: [0.4, 0, 1, 1] as const };

  const content = (
    <>
      <div ref={bodyRef} className={styles.body} data-lenis-prevent>
        {children}
      </div>
      <div ref={footerRef} className={styles.footer}>
        {actions}
      </div>
    </>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="dialog"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: t }}
          exit={{ opacity: 0, transition: tOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onKeyDown={onKeyDown}
          data-lenis-prevent
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cx(styles.panel, width === 'wide' && styles.wide)}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: t }}
            exit={{ opacity: 0, scale: 0.97, y: 8, transition: tOut }}
          >
            <div className={styles.head}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description && (
                <div id={descId} className={styles.description}>
                  {description}
                </div>
              )}
            </div>
            {onSubmit ? (
              <form className={styles.form} onSubmit={submit} noValidate>
                {content}
              </form>
            ) : (
              content
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
