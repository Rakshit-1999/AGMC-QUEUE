import styles from './charts.module.css';

export interface ChartTooltipProps {
  text: string;
  /** Anchor in chart pixels: horizontal centre of the band and the top of the bar. */
  x: number;
  y: number;
  /** Keeps the tooltip inside the chart at the edges. */
  align: 'start' | 'center' | 'end';
}

/**
 * Dark chart tooltip (DESIGN §1.22 look), 8 px above the bar. Purely visual: each band
 * already carries the same text as its accessible name, so this is hidden from assistive tech.
 */
export function ChartTooltip({ text, x, y, align }: ChartTooltipProps) {
  return (
    <div className={`${styles.tooltip} ${styles[`tip_${align}`]}`} style={{ left: x, top: y }} aria-hidden="true">
      {text}
    </div>
  );
}

/** Edge alignment for band `i` of `n`. */
export function tooltipAlign(i: number, n: number): ChartTooltipProps['align'] {
  if (n <= 3) return 'center';
  if (i < n * 0.2) return 'start';
  if (i >= n * 0.8) return 'end';
  return 'center';
}
