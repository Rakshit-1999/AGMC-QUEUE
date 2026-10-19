import type { CSSProperties, ReactNode } from 'react';
import { cx } from './internal/cx';
import styles from './Table.module.css';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** px number or any CSS width ("1fr" is not valid here; leave undefined for flexible columns). */
  width?: number | string;
  /** Minimum width for flexible columns. */
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  /** Right-aligned tabular numbers. */
  numeric?: boolean;
  render(row: T): ReactNode;
}

export type TableRowTone = 'clay' | 'highlight' | 'faded' | undefined;

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey(row: T): string;
  /** 'clay' = pale clay bg + left clay bar (past told time) · 'highlight' = faint amber · 'faded' = inactive. */
  rowTone?(row: T): TableRowTone;
  /** Shown in a single full-width row when `rows` is empty. Defaults to "—". */
  empty?: ReactNode;
  /** Single-line compact rows (36 px, 13.5 text): Settings, Activity, Audit, Sync history. */
  dense?: boolean;
  stickyHeader?: boolean;
  /** Below this width the table scrolls horizontally inside its card (Queue 900, Settings 760). */
  minWidth?: number;
  /** Accessible caption (visually hidden). */
  caption?: string;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  rowTone,
  empty,
  dense = false,
  stickyHeader = false,
  minWidth,
  caption,
  className,
}: TableProps<T>) {
  const tableStyle: CSSProperties | undefined = minWidth ? { minWidth } : undefined;
  return (
    <div className={cx(styles.scroller, className)} data-lenis-prevent>
      <table className={cx(styles.table, dense && styles.dense, stickyHeader && styles.stickyHeader)} style={tableStyle}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={colStyle(c)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={alignClass(c)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className={styles.emptyRow}>
              <td colSpan={columns.length}>{empty ?? <span className={styles.dash}>—</span>}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const tone = rowTone?.(row);
              return (
                <tr key={rowKey(row)} className={tone ? styles[tone] : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={alignClass(c)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function colStyle<T>(c: TableColumn<T>): CSSProperties | undefined {
  if (c.width === undefined && c.minWidth === undefined) return undefined;
  return { width: c.width, minWidth: c.minWidth };
}

function alignClass<T>(c: TableColumn<T>): string | undefined {
  if (c.numeric) return cx(styles.right, 'num');
  if (c.align === 'right') return styles.right;
  if (c.align === 'center') return styles.center;
  return undefined;
}

export interface CellStackProps {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

/** Two-line table cell: 14/500 ink over 12 ink-3. */
export function CellStack({ primary, secondary, className }: CellStackProps) {
  return (
    <div className={cx(styles.stack, className)}>
      <div className={styles.primary}>{primary}</div>
      {secondary !== undefined && secondary !== null && secondary !== '' && (
        <div className={styles.secondary}>{secondary}</div>
      )}
    </div>
  );
}
