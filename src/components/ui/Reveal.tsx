import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface RevealProps {
  /** Seconds; keep stagger at or below 0.04 per item, at most 6 items. */
  delay?: number;
  children: ReactNode;
  as?: 'div' | 'section';
  className?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Subtle scroll reveal for cards (opacity 0→1, y 8→0, once). Plain element under reduced motion.
 * Never use on table rows, list rows, KPI values or the TV.
 */
export function Reveal({ delay = 0, children, as = 'div', className }: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) {
    return as === 'section' ? <section className={className}>{children}</section> : <div className={className}>{children}</div>;
  }
  const Comp = as === 'section' ? motion.section : motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.32, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}
