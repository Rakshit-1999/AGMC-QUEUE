import type { VisitStatus } from '@/domain/types';
import { statusChip } from '@/store';
import { Chip } from './Chip';

export interface StatusChipProps {
  status: VisitStatus;
  className?: string;
}

/** Ticket status chip: Booked / Waiting / Called / With advisor / Done / No-show / Cancelled (SPEC "Shared wording"). */
export function StatusChip({ status, className }: StatusChipProps) {
  const spec = statusChip(status);
  return (
    <Chip tone={spec.tone} className={className}>
      {spec.text}
    </Chip>
  );
}
