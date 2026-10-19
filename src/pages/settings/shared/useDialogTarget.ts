import { useCallback, useState } from 'react';

interface DialogTargetState<T> {
  open: boolean;
  /** Last target shown; kept after close so the dialog can animate out with its content. */
  target: T | null;
  /** Bumped on every open; use as the dialog's `key` so its form re-initialises from the target. */
  session: number;
}

export interface DialogTarget<T> extends DialogTargetState<T> {
  show(target: T): void;
  close(): void;
}

/** Open/close state for an add/edit dialog whose form is seeded from `target` on each open. */
export function useDialogTarget<T>(): DialogTarget<T> {
  const [state, setState] = useState<DialogTargetState<T>>({ open: false, target: null, session: 0 });
  const show = useCallback((target: T) => setState((s) => ({ open: true, target, session: s.session + 1 })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return { ...state, show, close };
}
