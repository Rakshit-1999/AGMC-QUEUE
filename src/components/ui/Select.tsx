import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useFieldControl } from './Field';
import { cx } from './internal/cx';
import { usePopover } from './internal/usePopover';
import inputStyles from './internal/Input.module.css';
import styles from './Select.module.css';

export interface SelectOption<V> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<V> {
  /** V is inferred from `value` only (pass an explicit type argument for unions such as `string | null`). */
  value: V;
  onChange(value: NoInfer<V>): void;
  options: SelectOption<NoInfer<V>>[];
  /** Shown when `value` matches no option (e.g. "Pick a branch"). */
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** md = 34 px (default) · sm = 28 px (table filters). */
  size?: 'sm' | 'md';
  /** onGreen = the top-bar branch picker (translucent white pill). */
  variant?: 'default' | 'onGreen';
  /** Fixed width in px (filters 200). Defaults to 100% of the container. */
  width?: number;
  minWidth?: number;
  id?: string;
  /** Accessible name when not inside a <Field>. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Custom single-select (DESIGN §1.16): a combobox button + listbox popup that matches the house style.
 * Values can be any type (compared with Object.is), so `null` ("Whoever is free first") works.
 */
export function Select<V>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  invalid,
  size = 'md',
  variant = 'default',
  width,
  minWidth,
  id,
  ariaLabel,
  className,
}: SelectProps<V>) {
  const field = useFieldControl();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typeahead = useRef({ text: '', at: 0 });

  const selectedIndex = options.findIndex((o) => Object.is(o.value, value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isInvalid = invalid ?? field?.invalid ?? false;

  const closeSilently = useCallback(() => setOpen(false), []);
  const pos = usePopover({ open, onClose: closeSilently, triggerRef, popRef: listRef, align: 'start', matchWidth: true });

  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  const openList = (at?: number) => {
    if (disabled) return;
    setActive(at ?? (selectedIndex >= 0 ? selectedIndex : (enabled[0] ?? -1)));
    setOpen(true);
  };

  const choose = (i: number) => {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (!Object.is(opt.value, value)) onChange(opt.value);
  };

  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active, pos]);

  const move = (delta: 1 | -1) => {
    if (enabled.length === 0) return;
    const at = enabled.indexOf(active);
    const nextAt = at === -1 ? 0 : Math.min(enabled.length - 1, Math.max(0, at + delta));
    const next = enabled[nextAt];
    if (next !== undefined) setActive(next);
  };

  const typeTo = (key: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > 700 ? key : t.text + key;
    t.at = now;
    const q = t.text.toLowerCase();
    const start = open ? active : selectedIndex;
    const order = [...enabled.filter((i) => i > start), ...enabled.filter((i) => i <= start)];
    return order.find((i) => options[i]?.label.toLowerCase().startsWith(q));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
        const hit = typeTo(e.key);
        if (hit !== undefined) openList(hit);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        e.preventDefault();
        if (enabled[0] !== undefined) setActive(enabled[0]);
        break;
      case 'End': {
        e.preventDefault();
        const last = enabled[enabled.length - 1];
        if (last !== undefined) setActive(last);
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation(); // keep a surrounding dialog open
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const hit = typeTo(e.key);
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <>
      <button
        ref={triggerRef}
        id={id ?? field?.id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && field ? `${field.labelId} ${id ?? field.id}` : undefined}
        aria-describedby={field?.describedBy}
        aria-invalid={isInvalid || undefined}
        disabled={disabled}
        className={cx(
          variant === 'onGreen' ? styles.onGreen : inputStyles.box,
          styles.trigger,
          size === 'sm' && styles.sm,
          isInvalid && inputStyles.invalid,
          className,
        )}
        style={{ width, minWidth }}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={cx(styles.value, !selected && styles.placeholder)}>{selected?.label ?? placeholder ?? ''}</span>
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className={cx(styles.list, pos?.placement === 'top' && styles.up)}
            style={pos ? { top: pos.top, left: pos.left, minWidth: pos.minWidth } : { top: 0, left: 0, visibility: 'hidden' }}
            data-lenis-prevent
          >
            {options.map((o, i) => (
              <li
                key={`${i}-${o.label}`}
                id={optionId(i)}
                data-index={i}
                role="option"
                aria-selected={i === selectedIndex}
                aria-disabled={o.disabled || undefined}
                className={cx(
                  styles.option,
                  i === active && styles.active,
                  i === selectedIndex && styles.selected,
                  o.disabled && styles.disabled,
                )}
                // Keep focus on the trigger while clicking an option.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => choose(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
