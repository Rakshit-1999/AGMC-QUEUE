import { useCallback, useEffect, useState } from 'react';
import type { AdvisorId, AppState } from '@/domain/types';
import { OK } from '@/domain/messages';
import { selectTransferTargets, transfer, useAppState, useSession } from '@/store';
import { Button, Dialog, Field, FieldGrid, Select, TextInput, useToast } from '@/components/ui';

export interface TransferDialogProps {
  open: boolean;
  ticketNo: string;
  onClose(): void;
}

type Target = { value: AdvisorId | null; label: string };

function sameTargets(a: Target[], b: Target[]): boolean {
  return a.length === b.length && a.every((t, i) => t.value === b[i]?.value && t.label === b[i]?.label);
}

/** "Transfer A-021": back to the queue, to a colleague or to whoever is free next (kept at the front). */
export function TransferDialog({ open, ticketNo, onClose }: TransferDialogProps) {
  const toast = useToast();
  const advisorId = useSession()?.advisor?.id ?? null;
  const select = useCallback(
    (s: AppState): Target[] => (advisorId === null ? [] : selectTransferTargets(s, advisorId)),
    [advisorId],
  );
  const targets = useAppState(select, sameTargets);

  const [to, setTo] = useState<AdvisorId | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setTo(null);
    setReason('');
  }, [open]);

  // A colleague who left the branch meanwhile falls back to "Next free advisor".
  useEffect(() => {
    if (to !== null && !targets.some((t) => t.value === to)) setTo(null);
  }, [targets, to]);

  const onSubmit = () => {
    if (toast.fromResult(transfer(to, reason.trim()), OK.transferred)) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Transfer ${ticketNo}`}
      description="The customer goes back to the queue — to a colleague, or to whoever is free next (kept at the front)."
      onSubmit={onSubmit}
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button variant="primary" type="submit">
            Transfer
          </Button>
        </>
      }
    >
      <FieldGrid>
        <Field label="To">
          <Select<AdvisorId | null> value={to} onChange={setTo} options={targets} />
        </Field>
        <Field label="Reason">
          <TextInput value={reason} onChange={setReason} placeholder="e.g. MINI specialist needed" />
        </Field>
      </FieldGrid>
    </Dialog>
  );
}
