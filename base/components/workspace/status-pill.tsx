import { cn } from '@/lib/utils';
import {
  PA_STATUS_LABELS,
  PA_STATUS_TONES,
  REQUIREMENT_LABELS,
  REQUIREMENT_TONES,
  TONE_CLASSES,
  type Tone,
} from '@/lib/prior-auth';
import type { PaStatus, RequirementStatus } from '@/types';

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PaStatusPill({ status }: { status: PaStatus }) {
  return <Pill tone={PA_STATUS_TONES[status]}>{PA_STATUS_LABELS[status]}</Pill>;
}

export function RequirementStatusPill({ status }: { status: RequirementStatus }) {
  return <Pill tone={REQUIREMENT_TONES[status]}>{REQUIREMENT_LABELS[status]}</Pill>;
}
