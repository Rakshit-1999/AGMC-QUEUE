import { cx } from './internal/cx';
import styles from './Logo.module.css';

export interface LogoProps {
  tone?: 'white' | 'green';
  /**
   * Logo box height in px (top bar 22, sign-in 26, phone band 18, TV 40).
   * Omit it to size the logo from the surrounding font-size (box = 1.22em), e.g. for responsive CSS.
   */
  height?: number;
  className?: string;
}

/**
 * AGMC wordmark. PLACEHOLDER: white text "AGMC" until the official logo file is supplied
 * (DESIGN §1.1). Swap the inner markup for the SVG asset when it arrives; the props stay the same.
 */
export function Logo({ tone = 'white', height, className }: LogoProps) {
  // Text at 18 px matches a 22 px logo box (DESIGN: 18/700, tracking .04em).
  const style = height !== undefined ? { height, fontSize: Math.round(height * (18 / 22)) } : undefined;
  return (
    <span
      className={cx(styles.logo, height === undefined && styles.fluid, tone === 'green' && styles.green, className)}
      style={style}
      role="img"
      aria-label="AGMC"
    >
      AGMC
    </span>
  );
}
