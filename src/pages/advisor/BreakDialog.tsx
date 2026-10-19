import { useEffect, useState } from 'react';
import type { BreakReason } from '@/domain/types';
import { BREAK_REASONS } from '@/store';
import { Button, Dialog, PillChoice } from '@/components/ui';

export interface BreakDialogProps {
  open: boolean;
  /** Preselected pill (Coffee by default). */
  initialReason: BreakReason;
  onClose(): void;
  onStart(reason: BreakReason): void;
}

const OPTIONS = BREAK_REASONS.map((r) => ({ value: r, label: r }));

/** "Take a break" with the reason pills Coffee · Prayer · Lunch · Workshop · Meeting. */
export function BreakDialog({ open, initialReason, onClose, onStart }: BreakDialogProps) {
  const [reason, setReason] = useState<BreakReason>(initialReason);

  // Each opening starts from the preselected reason.
  useEffect(() => {
    if (open) setReason(initialReason);
  }, [open, initialReason]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Take a break"
      description="Your appointments that come due meanwhile can be covered by a colleague."
      onSubmit={() => onStart(reason)}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button variant="primary" type="submit">
            Start break
          </Button>
        </>
      }
    >
      <PillChoice<BreakReason> options={OPTIONS} value={reason} onChange={setReason} ariaLabel="Reason" />
    </Dialog>
  );
}
