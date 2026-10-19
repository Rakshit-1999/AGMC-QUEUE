import { useState } from 'react';
import { Button, Dialog, Field, Select, TextInput, useToast } from '@/components/ui';
import {
  cancelTicket,
  changeAdvisor,
  markNoShow,
  moveToFront,
  selectChangeAdvisorOptions,
  useAppState,
  type QueueRowView,
} from '@/store';
import { OK } from '@/domain/messages';
import type { ActionResult, AdvisorId, AppState, BranchId } from '@/domain/types';

export type QueueAction = { kind: 'change' | 'front' | 'noShow' | 'cancel'; row: QueueRowView };

interface Props {
  branchId: BranchId;
  /** The open dialog, or null. */
  action: QueueAction | null;
  onClose(): void;
}

/** The four row-menu dialogs of the Queue table (SPEC "Row dialogs"). */
export function QueueDialogs({ branchId, action, onClose }: Props) {
  const toast = useToast();
  // Keep the last action while the dialog animates out; reset the fields for each new one.
  const [shown, setShown] = useState<QueueAction | null>(action);
  const [reason, setReason] = useState('');
  const [advisor, setAdvisor] = useState<AdvisorId | null | undefined>(undefined);
  if (action !== null && action !== shown) {
    setShown(action);
    setReason('');
    setAdvisor(undefined);
  }

  const visitId = shown?.row.visitId ?? null;
  const currentAdvisor = useAppState((s: AppState) => (visitId ? s.visits[visitId]?.advisorId ?? null : null));
  const advisorOptions = useAppState(
    (s: AppState) => selectChangeAdvisorOptions(s, branchId),
    (a, b) => a.length === b.length && a.every((x, i) => x.value === b[i]?.value && x.label === b[i]?.label),
  );
  const advisorValue = advisor === undefined ? currentAdvisor : advisor;

  const ticket = shown?.row.ticketNo ?? '';
  const first = shown?.row.customerFirstName ?? '';
  const open = (kind: QueueAction['kind']) => action?.kind === kind;

  const run = (result: ActionResult, okMessage: string) => {
    if (toast.fromResult(result, okMessage)) onClose();
  };

  const back = (
    <Button variant="quiet" onClick={onClose}>
      Back
    </Button>
  );

  return (
    <>
      <Dialog
        open={open('change')}
        onClose={onClose}
        title={`Change ${ticket}'s advisor`}
        description={`${first} moves to this advisor's line and keeps their place by arrival time. Tell them who will see them.`}
        onSubmit={() => visitId && run(changeAdvisor(visitId, advisorValue, reason.trim()), OK.advisorChanged)}
        actions={
          <>
            {back}
            <Button type="submit">Change advisor</Button>
          </>
        }
      >
        <Field label="Advisor">
          <Select<AdvisorId | null> value={advisorValue} onChange={setAdvisor} options={advisorOptions} />
        </Field>
        <Field label="Reason">
          <TextInput value={reason} onChange={setReason} autoComplete="off" />
        </Field>
      </Dialog>

      <Dialog
        open={open('front')}
        onClose={onClose}
        title={`Move ${ticket} to the front`}
        description="Next for the first free advisor who can take it. Every override is logged with your reason."
        onSubmit={() => visitId && run(moveToFront(visitId, reason.trim()), OK.movedToFront)}
        actions={
          <>
            {back}
            <Button type="submit">Move to front</Button>
          </>
        }
      >
        <Field label="Reason">
          <TextInput
            value={reason}
            onChange={setReason}
            placeholder="e.g. elderly customer, VIP, came back after drop-off"
            required
            aria-required="true"
            autoComplete="off"
          />
        </Field>
      </Dialog>

      <Dialog
        open={open('noShow')}
        onClose={onClose}
        title={`${ticket} — no-show?`}
        description={`${first} is not here. The ticket closes as a no-show.`}
        actions={
          <>
            {back}
            <Button variant="danger" onClick={() => visitId && run(markNoShow(visitId), OK.markedNoShow)}>
              Mark no-show
            </Button>
          </>
        }
      />

      <Dialog
        open={open('cancel')}
        onClose={onClose}
        title={`Cancel ${ticket}`}
        description="The ticket closes and leaves the queue."
        onSubmit={() => visitId && run(cancelTicket(visitId, reason.trim()), OK.ticketCancelled)}
        actions={
          <>
            {back}
            <Button type="submit" variant="danger">
              Cancel ticket
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <TextInput value={reason} onChange={setReason} autoComplete="off" />
        </Field>
      </Dialog>
    </>
  );
}
