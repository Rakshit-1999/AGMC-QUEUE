import { useNavigate } from 'react-router-dom';
import { signIn } from '@/store';
import { ERR } from '@/domain/messages';
import { toast } from '@/components/ui';
import { BrandPanel } from './BrandPanel';
import { SignInForm } from './SignInForm';
import { DemoAccounts } from './DemoAccounts';
import styles from './LoginPage.module.css';

const DEMO_PASSWORD = 'agmc-demo';

export type SignInAttempt = (username: string, password: string) => string | null;

/** Page 1 — Sign in (SPEC). Split screen; on a phone the brand panel becomes a band at the top. */
export function LoginPage() {
  const navigate = useNavigate();

  /** Returns the inline error text, or null after a successful sign-in (and redirects to the role home). */
  const attempt: SignInAttempt = (username, password) => {
    const result = signIn(username.trim(), password);
    if (!result.ok) return result.error || ERR.wrongCredentials;
    navigate(result.data.home, { replace: true });
    return null;
  };

  return (
    <div className={styles.page}>
      <BrandPanel />
      <div className={styles.formPanel}>
        <div className={styles.formCol}>
          <SignInForm onSignIn={attempt} />
          <DemoAccounts
            onPick={(username) => {
              const error = attempt(username, DEMO_PASSWORD);
              if (error) toast.error(error);
            }}
          />
          <p className={styles.footerPhone}>© 2026 AGMC · Prototype</p>
        </div>
      </div>
    </div>
  );
}
