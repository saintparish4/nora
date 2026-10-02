'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePriorAuthorizations, PA_STATUSES, type PaStatus } from '@/lib/api';
import { PA_STATUS_LABELS } from '@/lib/prior-auth';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { PageHeader, Panel, Card, EmptyState, ErrorNote } from '@/components/workspace/page-header';
import { PaStatusPill, RequirementStatusPill } from '@/components/workspace/status-pill';

const FILTERS: Array<{ label: string; statuses: PaStatus[] | null }> = [
  { label: 'Open', statuses: null },
  { label: 'Needs clarification', statuses: ['needs_clarification'] },
  { label: 'Ready for approval', statuses: ['ready_for_review'] },
  { label: 'Ready to submit', statuses: ['approved'] },
  { label: 'With payer', statuses: ['submitted', 'payer_pending', 'appealed'] },
  { label: 'Decided', statuses: ['approved_by_payer', 'denied', 'closed'] },
];

function parseStatuses(raw: string | null): PaStatus[] | null {
  if (!raw) return null;
  const statuses = raw.split(',').filter((s): s is PaStatus => (PA_STATUSES as readonly string[]).includes(s));
  return statuses.length ? statuses : null;
}

function PriorAuthorizationList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statuses = parseStatuses(searchParams.get('status'));
  const page = Number(searchParams.get('page') ?? 1);
  const { data, error, isLoading } = usePriorAuthorizations(
    statuses ? { status: statuses, page } : { open: true, page }
  );

  const go = (next: PaStatus[] | null, nextPage = 1) => {
    const params = new URLSearchParams();
    if (next) params.set('status', next.join(','));
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    router.push(`/dashboard/prior-authorizations${qs ? `?${qs}` : ''}`);
  };
  const activeKey = statuses?.join(',') ?? '';

  return (
    <div>
      <PageHeader
        title="Prior authorizations"
        actions={<Button asChild><Link href="/dashboard/prior-authorizations/new">New prior authorization</Link></Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const key = f.statuses?.join(',') ?? '';
          return (
            <Button key={f.label} size="sm" variant={key === activeKey ? 'default' : 'secondary'} aria-pressed={key === activeKey} onClick={() => go(f.statuses)}>
              {f.label}
            </Button>
          );
        })}
        {statuses && !FILTERS.some((f) => f.statuses?.join(',') === activeKey) && (
          <span className="self-center text-sm text-muted-foreground">
            Showing {statuses.map((s) => PA_STATUS_LABELS[s]).join(', ')}
          </span>
        )}
      </div>

      <Panel>
        <ErrorNote error={error} />
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data && data.prior_authorizations.length > 0 ? (
          <>
            <ul className="space-y-2">
              {data.prior_authorizations.map((pa) => {
                const counts = pa.requirement_counts;
                return (
                  <li key={pa.id}>
                    <Link href={`/dashboard/prior-authorizations/${pa.id}`} className="group block rounded-2xl">
                      <Card className="flex flex-col gap-3 p-4 transition-colors group-hover:border-input group-hover:bg-tile-strong/50 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{pa.patient.full_name} · {pa.item_name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {pa.coverage.payer.name} · requested by {pa.requested_by.name}
                          {pa.assigned_to ? ` · assigned to ${pa.assigned_to.name}` : ''} · updated {formatDate(pa.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['missing', 'unclear', 'pending'] as const).map((s) =>
                          counts[s] ? (
                            <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                              <RequirementStatusPill status={s} /> {counts[s]}
                            </span>
                          ) : null
                        )}
                        <PaStatusPill status={pa.status} />
                        <ChevronRight aria-hidden className="hidden size-4 text-muted-foreground md:block" />
                      </div>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {data.meta.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => go(statuses, page - 1)}>Previous</Button>
                <span className="text-muted-foreground">Page {data.meta.page} of {data.meta.total_pages}</span>
                <Button size="sm" variant="secondary" disabled={page >= data.meta.total_pages} onClick={() => go(statuses, page + 1)}>Next</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState>No prior authorizations here.</EmptyState>
        )}
      </Panel>
    </div>
  );
}

export default function PriorAuthorizationsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <PriorAuthorizationList />
    </Suspense>
  );
}
