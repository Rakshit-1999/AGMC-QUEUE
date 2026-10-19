import type { QuoteBoxView } from '@/store';
import { LABEL } from '@/domain/messages';
import styles from './CheckIn.module.css';

type Props = { quote: QuoteBoxView; none?: undefined } | { none: { title: string; line: string }; quote?: undefined };

/** "Tell the customer" box: pale green, pale clay for long waits / after closing / nobody can take it. */
export function QuoteBox(props: Props) {
  if (props.none) {
    return (
      <div className={`${styles.quote} ${styles.quoteClay}`} role="status">
        <div className={styles.quoteAbout}>{props.none.title}</div>
        <div className={styles.quoteSeen}>{props.none.line}</div>
      </div>
    );
  }
  const q = props.quote;
  return (
    <div className={q.tone === 'clay' ? `${styles.quote} ${styles.quoteClay}` : styles.quote}>
      <div className={styles.quoteTell}>{q.tell}</div>
      <div className={`${styles.quoteAbout} num`}>{q.about}</div>
      <div className={styles.quoteSeen}>
        {q.seenByName ? <strong>{q.seenByName}</strong> : LABEL.firstFreeAdvisor} will see them · called by{' '}
        <strong className="num">{q.calledBy}</strong>
      </div>
      <div className={styles.quoteGrey}>{q.greyLine}</div>
      {q.afterClosing && <div className={styles.quoteWarn}>{q.afterClosing}</div>}
      {q.longWait && <div className={styles.quoteWarn}>{q.longWait}</div>}
    </div>
  );
}
