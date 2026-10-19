import { ChartTooltip, tooltipAlign } from './ChartTooltip';
import { SrDataTable, type SrTableData } from './SrDataTable';
import { fmtTick, niceScale, splitLabel, topRoundedBar } from './scale';
import { useChartHover } from './useChartHover';
import { useElementWidth } from './useElementWidth';
import styles from './charts.module.css';

export type SeriesTone = 'appt' | 'walk';

export interface ColumnSegment {
  value: number;
  tone: SeriesTone;
}

export interface ColumnDatum {
  key: string;
  /** X label under the column ("08", "10+ min sooner"). */
  axis: string;
  /** Bottom to top. One segment for a plain column, several for a stack. */
  segments: ColumnSegment[];
  /** Hover text, exactly as SPEC. Omit to make the chart non-interactive. */
  tooltip?: string;
  /** Count drawn above the column (wait-promise columns). */
  valueLabel?: string;
}

export interface ColumnChartProps {
  /** e.g. "Arrivals by hour, 07 to 17". */
  ariaLabel: string;
  data: ColumnDatum[];
  /** Total SVG height: 200 (default) or 160 (wait-promise columns). */
  height?: number;
  /** Clay dashed line across the plot, labelled at the right end. */
  capLine?: { value: number; label: string };
  /** Counts: whole-number ticks. */
  integer?: boolean;
  /** X labels may wrap to two lines. */
  wrapAxisLabels?: boolean;
  /** Shows the empty message inside the plot while the axes stay. */
  empty: boolean;
  emptyText: string;
  table: SrTableData;
}

const PAD_L = 32;
const PAD_R = 4;
const PAD_T = 18;
const PAD_B = 22;
const PAD_B_WRAPPED = 34;
const BAR_SHARE = 0.6;
const RADIUS = 3;
const TOOLTIP_GAP = 8;

/**
 * Column chart (plain or stacked) in hand-made SVG, drawn at the real pixel width (DESIGN §2.5 chart styling).
 * The SVG is role="img"; hover/focus targets are real buttons laid over each band.
 */
export function ColumnChart({
  ariaLabel,
  data,
  height = 200,
  capLine,
  integer = false,
  wrapAxisLabels = false,
  empty,
  emptyText,
  table,
}: ColumnChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const interactive = !empty && data.some((d) => d.tooltip !== undefined);
  const { active, bandProps } = useChartHover(data.length);

  const padB = wrapAxisLabels ? PAD_B_WRAPPED : PAD_B;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = height - PAD_T - padB;
  const baseY = PAD_T + plotH;
  const n = Math.max(1, data.length);
  const band = plotW / n;
  const barW = band * BAR_SHARE;

  const dataMax = Math.max(0, ...data.map((d) => d.segments.reduce((a, s) => a + s.value, 0)), capLine?.value ?? 0);
  const scale = niceScale(empty ? 0 : dataMax, 4, integer);
  const y = (v: number) => baseY - (v / scale.max) * plotH;

  const columns = data.map((d, i) => {
    const x = PAD_L + i * band + (band - barW) / 2;
    let acc = 0;
    const visible = d.segments.filter((s) => s.value > 0);
    const rects = visible.map((s, j) => {
      const top = y(acc + s.value);
      const bottom = y(acc);
      acc += s.value;
      const isTop = j === visible.length - 1;
      // 1 px white separator between stacked segments: shorten every segment above the first.
      const h = Math.max(0, bottom - top - (j > 0 ? 1 : 0));
      return { tone: s.tone, d: isTop ? topRoundedBar(x, top, barW, h, RADIUS) : `M${x},${top}h${barW}v${h}h${-barW}Z` };
    });
    return { datum: d, x, cx: PAD_L + i * band + band / 2, top: y(acc), rects };
  });

  const hovered = active !== null && interactive ? columns[active] : undefined;

  return (
    <div ref={wrapRef} className={styles.frame} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className={styles.svg}>
          {scale.ticks.map((t) => (
            <g key={t}>
              {t > 0 && <line x1={PAD_L} x2={PAD_L + plotW} y1={y(t)} y2={y(t)} className={styles.grid} />}
              <text x={PAD_L - 6} y={y(t)} className={styles.yTick} textAnchor="end" dominantBaseline="middle">
                {fmtTick(t)}
              </text>
            </g>
          ))}

          {hovered && <rect x={PAD_L + (active ?? 0) * band} y={PAD_T} width={band} height={plotH} className={styles.hoverBand} />}

          {!empty &&
            columns.map((c) => (
              <g key={c.datum.key}>
                {c.rects.map((r, j) => (
                  <path key={j} d={r.d} className={r.tone === 'appt' ? styles.fillAppt : styles.fillWalk} />
                ))}
                {c.datum.valueLabel !== undefined && (
                  <text x={c.cx} y={c.top - 4} className={styles.valueLabel} textAnchor="middle">
                    {c.datum.valueLabel}
                  </text>
                )}
              </g>
            ))}

          <line x1={PAD_L} x2={PAD_L + plotW} y1={baseY} y2={baseY} className={styles.baseline} />

          {columns.map((c) => {
            const lines = wrapAxisLabels ? splitLabel(c.datum.axis) : [c.datum.axis];
            return (
              <text key={c.datum.key} x={c.cx} y={baseY + 14} className={styles.xTick} textAnchor="middle">
                {lines.map((line, k) => (
                  <tspan key={k} x={c.cx} dy={k === 0 ? 0 : 12}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}

          {capLine && (
            <g>
              <line x1={PAD_L} x2={PAD_L + plotW} y1={y(capLine.value)} y2={y(capLine.value)} className={styles.capLine} />
              <text x={PAD_L + plotW} y={y(capLine.value) - 4} className={styles.capLabel} textAnchor="end">
                {capLine.label}
              </text>
            </g>
          )}

          {empty && (
            <text x={PAD_L + plotW / 2} y={PAD_T + plotH / 2} className={styles.emptyText} textAnchor="middle" dominantBaseline="middle">
              {emptyText}
            </text>
          )}
        </svg>
      )}

      {interactive && width > 0 && (
        <div className={styles.bands} role="group" aria-label={ariaLabel}>
          {columns.map((c, i) =>
            c.datum.tooltip === undefined ? null : (
              <button
                key={c.datum.key}
                type="button"
                className={styles.band}
                style={{ left: PAD_L + i * band, top: PAD_T, width: band, height: plotH }}
                aria-label={c.datum.tooltip}
                {...bandProps(i)}
              />
            ),
          )}
        </div>
      )}

      {hovered?.datum.tooltip !== undefined && (
        <ChartTooltip
          text={hovered.datum.tooltip}
          x={hovered.cx}
          y={Math.min(hovered.top, baseY) - TOOLTIP_GAP}
          align={tooltipAlign(active ?? 0, data.length)}
        />
      )}

      <SrDataTable {...table} />
    </div>
  );
}
