import { Chip, type ChipTone } from './Chip';

export interface TypeChipProps {
  /** Pre-computed by selectors (ChipSpec from store/selectors/common.ts). */
  spec: { text: string; tone: ChipTone };
  dot?: boolean;
  className?: string;
}

/** Renders any selector-computed chip ("Appointment 12:30", "Walk-in", "in 28 min", …). */
export function TypeChip({ spec, dot, className }: TypeChipProps) {
  return (
    <Chip tone={spec.tone} dot={dot} className={className}>
      {spec.text}
    </Chip>
  );
}
