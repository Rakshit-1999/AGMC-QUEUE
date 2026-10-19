import { useState, type FormEvent } from 'react';
import { Button, Field, PlaceholderTag, TextInput } from '@/components/ui';
import type { SignInAttempt } from './LoginPage';
import styles from './LoginPage.module.css';

export function SignInForm({ onSignIn }: { onSignIn: SignInAttempt }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(onSignIn(username, password));
  };

  const invalid = error !== null;

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="signin-title">
      <h1 id="signin-title" className={styles.title}>
        Sign in
      </h1>
      <p className={styles.sub}>
        Microsoft sign-in (SSO) will replace this form.
        <PlaceholderTag />
      </p>

      <div className={styles.fields}>
        <Field label="Username">
          <TextInput
            value={username}
            onChange={(v) => {
              setUsername(v);
              if (error) setError(null);
            }}
            invalid={invalid}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            invalid={invalid}
            autoComplete="current-password"
          />
        </Field>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth className={styles.submit}>
        Sign in
      </Button>
    </form>
  );
}
