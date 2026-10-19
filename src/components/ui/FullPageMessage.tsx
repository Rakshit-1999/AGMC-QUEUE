import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import styles from './FullPageMessage.module.css';

export interface FullPageMessageProps {
  /** Exact SPEC message, e.g. "Not your branch". */
  message: string;
  /** Button back to the role home, label reusing the nav label ("Queue" / "My desk" / "Overview"). */
  action?: { label: string; to: string };
}

/** Access-error card (DESIGN §2.8): centred, max-width 440, margin-top 80, clay 15/600 text. */
export function FullPageMessage({ message, action }: FullPageMessageProps) {
  const navigate = useNavigate();
  return (
    <div className={styles.card} role="alert">
      <p className={styles.text}>{message}</p>
      {action && (
        <Button variant="primary" onClick={() => navigate(action.to)}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
