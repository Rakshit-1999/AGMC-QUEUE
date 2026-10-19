import { useState } from 'react';
import { Button, Dialog, Field, Select, useToast } from '@/components/ui';
import { checkInAppointment, selectPickAdvisorOptions, useAppState, useLive } from '@/store';
import type { AdvisorId, BranchId, VisitId } from '@/domain/types';

type Pick = AdvisorId | 'first_free';

interface Props {
  branchId: BranchId;
  /** Open while set. */
  visitId: VisitId | null;
  onClose(): void;
  onIssued(visitId: VisitId): void;
}

/**
 * Pick-advisor dialog: opens on "change advisor", or on Check in when the booking has no advisor.
 * The action button checks the customer in with the chosen advisor (SPEC buttons: Back · Check in).
 */
export function PickAdvisorDialog({ branchId, visitId, onClose, onIssued }: Props) {
  const toast = useToast();
  // Keep the last visit while the dialog animates out.
  const [shown, setShown] = useState<VisitId | null>(visitId);
  const [choice, setChoice] = useState<Pick | null>(null);
  if (visitId !== null && visitId !== shown) {
    setShown(visitId);
    setChoice(null);
  }

  const view = useLive((s, now) => (shown ? selectPickAdvisorOptions(s, branchId, shown, now) : null), [branchId, shown]);
  const current = useAppState((s) => (shown ? s.visits[shown]?.advisorId ?? null : null));

  const options = view?.options ?? [];
  const fallback: Pick | null = options.find((o) => o.value === current)?.value ?? options[0]?.value ?? null;
  const value: Pick | null = choice !== null && options.some((o) => o.value === choice) ? choice : fallback;

  const submit = () => {
    if (!shown || value === null) return;
    const r = checkInAppointment(shown, value);
    if (r.ok) onIssued(r.data.visitId);
    else toast.error(r.error);
  };

  return (
    <Dialog
      open={visitId !== null}
      onClose={onClose}
      title={view?.title ?? ''}
      description={view?.explanation}
      onSubmit={submit}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button type="submit" disabled={value === null}>
            Check in
          </Button>
        </>
      }
    >
      <Field label="Advisor">
        <Select<Pick | null> value={value} onChange={(v) => setChoice(v)} options={options} />
      </Field>
    </Dialog>
  );
}
