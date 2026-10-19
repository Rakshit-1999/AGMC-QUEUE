import { ChartTooltip } from './ChartTooltip';
import { SrDataTable, type SrTableData } from './SrDataTable';
import { rightRoundedBar } from './scale';
import { useChartHover } from './useChartHover';
import { useElementWidth } from './useElementWidth';
import styles from './charts.module.css';

export interface HBarDatum {
  key: string;
  /** Left label ("Service"). */
  label: string;
  /** Bar length; null = no visits (no bar). */
  value: number | null;
  /** Dark tick position (configured minutes). */
  marker: number;
  /** Value text at the bar end ("33′"). */
  valueText: string;
  /** Value text in clay. */
  over: boolean;
  /** Hover text, exactly as SPEC. */
  tooltip: string;
}

export interface HBarChartProps {
  ariaLabel: string;
  data: HBarDatum[];
  empty: boolean;
  emptyText: string;
  table: SrTableData;
}

const LABEL_COL = 84;
const PAD_R = 40; // room for the value text at the bar end
const PAD_Y = 8;
const ROW = 32;
const BAR_H = 16;
const TICK_H = 24;
const RADIUS = 3;
const HEADROOM = 1.05;
const TOOLTIP_GAP = 8;

/** Horizontal bars with a configured tick (Desk time by service type, DESIGN §2.5). */
export function HBarChart({ ariaLabel, data, empty, emptyText, table }: HBarChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const { active, bandProps } = useChartHover(data.length);

  const height = PAD_Y * 2 + Math.max(1, data.length) * ROW;
  const x0 = LABEL_COL;
  const plotW = Math.max(0, width - x0 - PAD_R);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value ?? 0, d.marker))) * HEADROOM;
  const x = (v: number) => x0 + (v / max) * plotW;

  const rows = data.map((d, i) => {
    const rowTop = PAD_Y + i * ROW;
    const cy = rowTop + ROW / 2;
    const end = d.value === null ? x0 : x(d.value);
    return { datum: d, rowTop, cy, end };
  });
  const hovered = active !== null && !empty ? rows[active] : undefined;

  return (
    <div ref={wrapRef} className={styles.frame} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className={styles.svg}>
          {hovered && <rect x={0} y={hovered.rowTop} width={width} height={ROW} className={styles.hoverBand} />}
          {rows.map((r) => (
            <g key={r.datum.key}>
              <text x={0} y={r.cy} className={styles.hLabel} dominantBaseline="middle">
                {r.datum.label}
              </text>
              {!empty && r.datum.value !== null && r.datum.value > 0 && (
                <path d={rightRoundedBar(x0, r.cy - BAR_H / 2, r.end - x0, BAR_H, RADIUS)} className={styles.fillAppt} />
              )}
              {!empty && (
                <>
                  <rect x={x(r.datum.marker) - 1} y={r.cy - TICK_H / 2} width={2} height={TICK_H} className={styles.marker} />
                  <text
                    x={Math.max(r.end, x(r.datum.marker)) + 6}
                    y={r.cy}
                    className={r.datum.over ? `${styles.hValue} ${styles.hValueOver}` : styles.hValue}
                    dominantBaseline="middle"
                  >
                    {r.datum.valueText}
                  </text>
                </>
              )}
            </g>
          ))}
          <line x1={x0} x2={x0} y1={PAD_Y} y2={height - PAD_Y} className={styles.baseline} />
          {empty && (
            <text x={x0 + plotW / 2} y={height / 2} className={styles.emptyText} textAnchor="middle" dominantBaseline="middle">
              {emptyText}
            </text>
          )}
        </svg>
      )}

      {!empty && width > 0 && (
        <div className={styles.bands} role="group" aria-label={ariaLabel}>
          {rows.map((r, i) => (
            <button
              key={r.datum.key}
              type="button"
              className={styles.band}
              style={{ left: 0, top: r.rowTop, width, height: ROW }}
              aria-label={r.datum.tooltip}
              {...bandProps(i)}
            />
          ))}
        </div>
      )}

      {hovered && (
        <ChartTooltip
          text={hovered.datum.tooltip}
          x={Math.min(Math.max(hovered.end, x0 + 60), width - 60)}
          y={hovered.cy - BAR_H / 2 - TOOLTIP_GAP}
          align="center"
        />
      )}

      <SrDataTable {...table} />
    </div>
  );
}
