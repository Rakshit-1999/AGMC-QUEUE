import { useState } from 'react';
import { OK } from '@/domain/messages';
import { saveBrands, selectBrandsText, useAppState } from '@/store';
import { Button, Card, PlaceholderTag, TextInput, useToast } from '@/components/ui';
import styles from '../shared/settings.module.css';

/** Brands card: one comma-separated text box and Save ("Brands saved"). */
export function BrandsCard() {
  const toast = useToast();
  const saved = useAppState(selectBrandsText);
  // null = untouched: the box follows the stored list (including changes from other tabs).
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = draft ?? saved;

  const save = () => {
    const r = saveBrands(value);
    toast.fromResult(r, OK.brandsSaved);
    if (r.ok) {
      setDraft(null);
      setError(null);
    } else {
      setError(r.error);
    }
  };

  return (
    <Card
      title={
        <>
          Brands
          <PlaceholderTag className={styles.tagGap} />
        </>
      }
    >
      <p className={styles.text}>
        Comma-separated. Which brands go through this queue is question 5.
      </p>
      <form
        className={styles.cardRow}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <TextInput
          className={styles.brandsBox}
          value={value}
          onChange={(v) => {
            setDraft(v);
            setError(null);
          }}
          aria-label="Brands"
          invalid={error !== null}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary">
          Save
        </Button>
      </form>
      {error && (
        <p className={styles.inlineError}>
          {error}
        </p>
      )}
    </Card>
  );
}
