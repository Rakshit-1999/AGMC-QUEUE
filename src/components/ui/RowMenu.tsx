import { Fragment, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './internal/cx';
import { usePopover } from './internal/usePopover';
import styles from './RowMenu.module.css';

export interface RowMenuItem {
  label: string;
  onSelect(): void;
  /** Clay text; a separator is drawn above the first destructive item. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowMenuProps {
  items: RowMenuItem[];
  /** e.g. "Actions for W-018". Defaults to "Row actions". */
  ariaLabel?: string;
  className?: string;
}

/** "•••" row menu (DESIGN §1.6) with full keyboard support. */
export function RowMenu({ items, ariaLabel = 'Row actions', className }: RowMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const closeSilently = useCallback(() => setOpen(false), []);

  const pos = usePopover({ open, onClose: closeSilently, triggerRef, popRef: menuRef, align: 'end' });

  const enabledIndexes = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const openAt = (which: 'first' | 'last') => {
    const idx = which === 'first' ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
    setActive(idx ?? 0);
    setOpen(true);
  };

  useEffect(() => {
    if (open && pos) itemRefs.current[active]?.focus();
  }, [open, pos, active]);

  const move = (delta: 1 | -1) => {
    if (enabledIndexes.length === 0) return;
    const at = enabledIndexes.indexOf(active);
    const next = enabledIndexes[(at + delta + enabledIndexes.length) % enabledIndexes.length];
    if (next !== undefined) setActive(next);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt('last');
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
        if (enabledIndexes[0] !== undefined) setActive(enabledIndexes[0]);
        break;
      case 'End': {
        e.preventDefault();
        const last = enabledIndexes[enabledIndexes.length - 1];
        if (last !== undefined) setActive(last);
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const ch = e.key.toLowerCase();
          const order = [...enabledIndexes.filter((i) => i > active), ...enabledIndexes.filter((i) => i <= active)];
          const hit = order.find((i) => items[i]?.label.toLowerCase().startsWith(ch));
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  const choose = (item: RowMenuItem) => {
    if (item.disabled) return;
    close(true);
    item.onSelect();
  };

  const firstDestructive = items.findIndex((it) => it.destructive);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, open && styles.triggerOpen, className)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : openAt('first'))}
        onKeyDown={onTriggerKeyDown}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={ariaLabel}
            className={cx(styles.menu, pos?.placement === 'top' && styles.up)}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
            onKeyDown={onMenuKeyDown}
            data-lenis-prevent
          >
            {items.map((item, i) => (
              <Fragment key={item.label}>
                {i === firstDestructive && i > 0 && <div role="separator" className={styles.separator} />}
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={i === active ? 0 : -1}
                  aria-disabled={item.disabled || undefined}
                  className={cx(styles.item, item.destructive && styles.destructive, item.disabled && styles.disabled)}
                  onClick={() => choose(item)}
                  onMouseEnter={() => !item.disabled && setActive(i)}
                >
                  {item.label}
                </button>
              </Fragment>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
