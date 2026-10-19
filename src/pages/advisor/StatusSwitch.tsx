import { useState } from 'react';
import type { AdvisorPresence, BreakReason } from '@/domain/types';
import { LABEL, OK } from '@/domain/messages';
import { goOffline, setAvailable, startBreak } from '@/store';
import { Segmented, useToast, type SegmentedOption } from '@/components/ui';
import { BreakDialog } from './BreakDialog';

export interface StatusSwitchProps {
  presence: AdvisorPresence;
  /** A customer is at the desk: the other two segments are disabled. */
  locked: boolean;
}

const SEGMENTS: { value: AdvisorPresence; label: string; tone: 'green' | 'amber' | 'dark' }[] = [
  { value: 'available', label: 'Available', tone: 'green' },
  { value: 'break', label: 'Break', tone: 'amber' },
  { value: 'offline', label: 'Offline', tone: 'dark' },
];

/** Available · Break · Offline. Picking Break opens the Break dialog; the segment switches only after Start break. */
export function StatusSwitch({ presence, locked }: StatusSwitchProps) {
  const toast = useToast();
  const [breakOpen, setBreakOpen] = useState(false);

  const options: SegmentedOption<AdvisorPresence>[] = SEGMENTS.map((s) => {
    const disabled = locked && s.value !== presence;
    return { ...s, disabled, tooltip: disabled ? LABEL.statusLockedTooltip : undefined };
  });

  const onChange = (next: AdvisorPresence) => {
    if (next === 'available') toast.fromResult(setAvailable(), OK.available);
    else if (next === 'offline') toast.fromResult(goOffline(), OK.offline);
    else setBreakOpen(true);
  };

  const onStartBreak = (reason: BreakReason) => {
    if (toast.fromResult(startBreak(reason), OK.breakStarted)) setBreakOpen(false);
  };

  return (
    <>
      <Segmented<AdvisorPresence> options={options} value={presence} onChange={onChange} ariaLabel="Your status" />
      <BreakDialog
        open={breakOpen}
        initialReason="Coffee"
        onClose={() => setBreakOpen(false)}
        onStart={onStartBreak}
      />
    </>
  );
}
