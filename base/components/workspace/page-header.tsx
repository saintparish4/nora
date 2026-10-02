import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notice } from '@/components/workspace/notice';

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 pt-2 sm:mb-10">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[2rem] leading-[1.08] tracking-[-0.035em] break-words sm:text-[2.5rem]">{title}</h1>
          {subtitle && <div className="mt-2 text-[0.9375rem] text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A soft off-white tile: the unit every workspace screen is built from. */
export function Panel({ title, action, children, className }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-tile bg-tile p-5 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-[1.0625rem] font-semibold tracking-[-0.015em]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A white card that sits on a Panel: one record, one excerpt, one row group. */
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-border bg-white', className)} {...props} />;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-input bg-white/60 px-6 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Notice tone="danger" role="alert">
      {error instanceof Error ? error.message : 'Something went wrong.'}
    </Notice>
  );
}
