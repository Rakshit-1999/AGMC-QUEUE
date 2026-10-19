import type { QueueRules } from '@/domain/types';

export interface QueueRuleSpec {
  key: keyof QueueRules;
  name: string;
  explanation: string;
  max: number;
}

/** QUEUE RULES rows, in SPEC order, with the explanation copy exactly as SPEC Tab 1 gives it. */
export const QUEUE_RULES: readonly QueueRuleSpec[] = [
  {
    key: 'earlyWindowMin',
    name: 'Early window',
    explanation: 'An appointment can start this many minutes before its slot.',
    max: 240,
  },
  {
    key: 'graceMin',
    name: 'Grace for late arrivals',
    explanation:
      'A late appointment customer keeps the slot for this long; after it they join as a walk-in, and a customer who never arrives is marked a no-show.',
    max: 240,
  },
  {
    key: 'walkInCapMin',
    name: 'Walk-in wait cap',
    explanation: 'A walk-in who has waited this long goes ahead of appointments that are not due yet.',
    max: 240,
  },
  {
    key: 'hardCeilingMin',
    name: 'Walk-in hard ceiling',
    explanation:
      'A walk-in who has waited this long goes ahead of everyone, even an appointment that is due (that appointment starts a few minutes late instead). 0 = off.',
    max: 240,
  },
  {
    key: 'safetyBufferMin',
    name: 'Safety buffer',
    explanation: 'A walk-in only goes to an advisor if it ends this many minutes before their next appointment.',
    max: 240,
  },
  {
    key: 'helpAfterMin',
    name: 'Help after',
    explanation: 'Another advisor may take an appointment once it is this late and its own advisor is still busy.',
    max: 240,
  },
  {
    key: 'swapAdvisorMin',
    name: 'Swap advisor if theirs is this far off',
    explanation:
      'A walk-in waits for the advisor chosen at issue, unless that advisor will not be free for this many minutes and a colleague can see them now. 0 = only at the time told or the ceiling.',
    max: 240,
  },
  {
    key: 'onTimeTargetMin',
    name: 'On-time target',
    explanation: 'An appointment counts as started on time if called within this many minutes of the later of slot and arrival.',
    max: 240,
  },
  {
    key: 'learnDays',
    name: 'Learn from the last (days)',
    explanation:
      'Desk times and the wait-quote margin are learned from this many days of history. 0 = use the configured minutes and a fixed +20% margin.',
    max: 365,
  },
  {
    key: 'promiseTargetPct',
    name: 'Walk-ins called by the time told (%)',
    explanation:
      'The quote margin is set so this share of walk-ins are called before the time reception told them. Higher = more cautious quotes.',
    max: 100,
  },
];
