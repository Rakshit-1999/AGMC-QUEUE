import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ActionResult } from '@/domain/types';
import { cx } from './internal/cx';
import styles from './toast.module.css';

type ToastKind = 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  /** Dark pill, bottom centre, 2.6 s. */
  success(message: string): void;
  /** Clay pill, 5 s. Text exactly as written in SPEC / the action's error. */
  error(message: string): void;
  /** Shows `okMessage` on success or the result's error; returns `r.ok`. */
  fromResult<T>(r: ActionResult<T>, okMessage: string): boolean;
}

const DURATION_MS: Record<ToastKind, number> = { success: 2600, error: 5000 };
const MAX_VISIBLE = 3;

// ---- tiny external store so toasts can be raised from guards and other non-React code ----
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function push(kind: ToastKind, message: string) {
  if (!message) return;
  // The same message twice in a row just restarts its timer instead of stacking.
  const last = items[items.length - 1];
  if (last && last.kind === kind && last.message === message) {
    items = [...items.slice(0, -1), { ...last, id: nextId++ }];
  } else {
    items = [...items, { id: nextId++, kind, message }].slice(-MAX_VISIBLE);
  }
  emit();
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getSnapshot = () => items;

/** Imperative instance for guards and non-component code. */
export const toast: ToastApi = {
  success: (m) => push('success', m),
  error: (m) => push('error', m),
  fromResult(r, okMessage) {
    if (r.ok) push('success', okMessage);
    else push('error', r.error);
    return r.ok;
  },
};

export function useToast(): ToastApi {
  return toast;
}

/** Renders the toast viewport. Mount once near the app root (App.tsx). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      {children}
      {createPortal(
        <div className={styles.viewport}>
          <AnimatePresence initial={false}>
            {list.map((t) => (
              <ToastPill key={t.id} item={t} reduced={reduced} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}

function ToastPill({ item, reduced }: { item: ToastItem; reduced: boolean }) {
  const remaining = useRef(DURATION_MS[item.kind]);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const start = () => {
    startedAt.current = Date.now();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dismiss(item.id), remaining.current);
  };
  const pause = () => {
    window.clearTimeout(timer.current);
    remaining.current = Math.max(500, remaining.current - (Date.now() - startedAt.current));
  };

  // Each pill instance owns one timer; `item.id` never changes for a mounted pill.
  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, [item.id]);

  return (
    <motion.div
      layout={!reduced}
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      className={cx(styles.toast, item.kind === 'error' && styles.error)}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: 8, transition: reduced ? { duration: 0 } : { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
      onPointerEnter={pause}
      onPointerLeave={start}
    >
      {item.message}
    </motion.div>
  );
}
