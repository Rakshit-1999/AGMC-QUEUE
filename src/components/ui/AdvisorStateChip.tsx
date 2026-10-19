import type { AdvisorLiveState } from '@/domain/types';
import { advisorStateChip } from '@/store';
import { Chip } from './Chip';

export interface AdvisorStateChipProps {
  state: AdvisorLiveState;
  className?: string;
}

/** Serving / Calling / Available / On break / Offline, always with a dot. Calling pulses gently. */
export function AdvisorStateChip({ state, className }: AdvisorStateChipProps) {
  const spec = advisorStateChip(state);
  return (
    <Chip tone={spec.tone} dot pulse={state === 'calling'} className={className}>
      {spec.text}
    </Chip>
  );
}
