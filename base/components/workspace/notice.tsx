import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-tile-strong text-body',
  info: 'bg-blue-tint text-blue-deep',
  success: 'bg-green-tint text-green-deep',
  warning: 'bg-yellow-tint text-yellow-deep',
  danger: 'bg-orange-tint text-orange-deep',
} as const;

export type NoticeTone = keyof typeof TONES;

/** A tinted, borderless message block: status lines, warnings, form errors. */
export function Notice({
  tone = 'neutral',
  className,
  ...props
}: React.ComponentProps<'div'> & { tone?: NoticeTone }) {
  return <div className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed', TONES[tone], className)} {...props} />;
}
