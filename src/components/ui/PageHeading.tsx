import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './internal/cx';
import styles from './PageHeading.module.css';

export interface PageHeadingLink {
  label: string;
  /** Internal route (react-router). */
  to?: string;
  /** External/absolute URL. */
  href?: string;
  newTab?: boolean;
}

export interface PageHeadingProps {
  title: string;
  /** Grey line under the title (13 ink-2). */
  subtitle?: string;
  /** Small back link above the title, e.g. { label: '← All branches', to: '/manager' }. */
  back?: { label: string; to: string };
  /** Optional link on the right ("Open waiting-area screen ↗"). Put the arrow in the label. */
  link?: PageHeadingLink;
  /** Any control on the right (e.g. the advisor status switch). Rendered after `link`. */
  right?: ReactNode;
  className?: string;
}

export function PageHeading({ title, subtitle, back, link, right, className }: PageHeadingProps) {
  return (
    <div className={cx(styles.heading, className)}>
      <div className={styles.text}>
        {back && (
          <Link to={back.to} className={styles.back}>
            {back.label}
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {(link || right) && (
        <div className={styles.right}>
          {link && <HeadingLink link={link} />}
          {right}
        </div>
      )}
    </div>
  );
}

function HeadingLink({ link }: { link: PageHeadingLink }) {
  const tabProps = link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  if (link.to !== undefined) {
    return (
      <Link to={link.to} className={styles.link} {...tabProps}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} className={styles.link} {...tabProps}>
      {link.label}
    </a>
  );
}
