import { useCallback, useState } from 'react';
import type { ActionResult } from '@/domain/types';
import { useToast } from '@/components/ui';

export type FieldErrors<F> = Partial<Record<keyof F, string>>;

/**
 * Maps an action's error string (an ERR constant) to the field it belongs to, so the message can
 * also be shown inline under that field (DESIGN §2.8). Validation itself stays in the action.
 */
export type ErrorFieldMap<F> = Readonly<Partial<Record<string, keyof F>>>;

export interface SettingsForm<F> {
  form: F;
  errors: FieldErrors<F>;
  set<K extends keyof F>(key: K, value: F[K]): void;
  /**
   * Shows the result as a toast (success message or the action's error). On failure the error is
   * also placed under its field when `map` knows it. Returns `r.ok`.
   */
  report<T>(r: ActionResult<T>, okMessage: string, map: ErrorFieldMap<F>): boolean;
}

/** Local form state for a settings dialog: values, inline errors, and toast reporting. */
export function useSettingsForm<F extends object>(init: () => F): SettingsForm<F> {
  const toast = useToast();
  const [form, setForm] = useState<F>(init);
  const [errors, setErrors] = useState<FieldErrors<F>>({});

  const set = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (e[key] === undefined) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const report = useCallback(
    <T>(r: ActionResult<T>, okMessage: string, map: ErrorFieldMap<F>): boolean => {
      const ok = toast.fromResult(r, okMessage);
      if (r.ok) {
        setErrors({});
      } else {
        const field = map[r.error];
        setErrors(field !== undefined ? ({ [field]: r.error } as FieldErrors<F>) : {});
      }
      return ok;
    },
    [toast],
  );

  return { form, errors, set, report };
}
