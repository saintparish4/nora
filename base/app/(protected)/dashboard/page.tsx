'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { useMetrics, useToday } from '@/lib/api';
import { TONE_DOTS, type Tone } from '@/lib/prior-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, Card, EmptyState, ErrorNote } from '@/components/workspace/page-header';
import { PaStatusPill } from '@/components/workspace/status-pill';
import { TaskList } from '@/components/workspace/task-list';

const COUNT_TILES: ReadonlyArray<{ key: string; label: string; tone: Tone; include?: readonly string[] }> = [
  { key: 'gathering', label: 'Gathering evidence', tone: 'info' },
  { key: 'needs_clarification', label: 'Need clarification', tone: 'warning' },
  { key: 'ready_for_review', label: 'Ready for approval', tone: 'accent' },
  { key: 'approved', label: 'Ready to submit', tone: 'success' },
  { key: 'payer_pending', label: 'With payer', tone: 'neutral', include: ['submitted', 'payer_pending', 'appealed'] },
];

export default function TodayPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useToday();
  const byStatus = data?.counts.by_status ?? {};

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={user?.organization?.name}
        actions={
          <Button asChild>
            <Link href="/dashboard/prior-authorizations/new">New prior authorization</Link>
          </Button>
        }
      />

      <ErrorNote error={error} />

      <div data-tour="counts" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {COUNT_TILES.map((tile) => {
          const keys = tile.include ?? [tile.key];
          const count = keys.reduce((sum, k) => sum + (byStatus[k] ?? 0), 0);
          return (
            <Link
              key={tile.key}
              href={`/dashboard/prior-authorizations?status=${keys.join(',')}`}
              className="rounded-tile bg-tile p-5 transition-colors last:col-span-2 hover:bg-tile-strong md:last:col-span-1"
            >
              {/* Inter, not the display face: its zero cannot be read as a letter. */}
              <p className="text-[2.5rem] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums">
                {isLoading ? '–' : count}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-body">
                <span className={cn('size-2 shrink-0 rounded-full', TONE_DOTS[tile.tone])} aria-hidden />
                {tile.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Needs attention" tour="attention">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data && data.needs_attention.length > 0 ? (
            <ul className="space-y-2">
              {data.needs_attention.map(({ kind, reason, action, prior_authorization: pa }) => (
                <li key={`${kind}-${pa.id}`}>
                  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {pa.patient.full_name} · {pa.item_name}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <PaStatusPill status={pa.status} />
                        <span>{reason} · {pa.coverage.payer.name}</span>
                      </p>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="shrink-0 self-start sm:self-auto">
                      <Link href={`/dashboard/prior-authorizations/${pa.id}`}>{action}</Link>
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nothing needs you right now.</EmptyState>
          )}
        </Panel>

        <Panel
          title={`My tasks${data ? ` (${data.counts.my_open_tasks})` : ''}`}
          action={<Link href="/dashboard/tasks" className="text-sm font-medium text-blue-deep hover:underline">All tasks</Link>}
        >
          {data && data.my_tasks.length > 0 ? (
            <TaskList tasks={data.my_tasks} onChange={() => mutate()} />
          ) : (
            <EmptyState>No open tasks assigned to you.</EmptyState>
          )}
          {data && data.counts.overdue_tasks > 0 && (
            <p className="mt-3 text-sm font-medium text-orange-deep">
              {data.counts.overdue_tasks} overdue task{data.counts.overdue_tasks === 1 ? '' : 's'} across the practice.
            </p>
          )}
        </Panel>
      </div>

      <PilotMeasurements />
    </div>
  );
}

function PilotMeasurements() {
  const { data } = useMetrics();
  if (!data || data.requests_created === 0) return null;

  const minutes = (value: number | null) => (value === null ? '–' : `${value} min`);
  const rows = [
    { label: 'Requests created', value: data.requests_created },
    { label: 'Approved by a clinician', value: data.requests_approved },
    { label: 'Median staff-reported prep time', value: minutes(data.median_reported_prep_minutes), note: `${data.reported_prep_count} reported` },
    { label: 'Median time from creation to approval', value: minutes(data.median_minutes_to_approval) },
    { label: 'Submitted to payer', value: data.submitted },
    { label: 'Payer decisions', value: `${data.payer_approved} approved`, note: `${data.payer_denied} denied` },
  ];

  return (
    <Panel title={`Measurements, last ${data.window_days} days`} className="mt-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.label} className="p-4">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink tabular-nums">
              {row.value}
              {row.note && <span className="ml-2 text-sm font-normal tracking-normal whitespace-nowrap text-muted-foreground">{row.note}</span>}
            </dd>
          </Card>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Time to approval is wall-clock time and includes waiting. Staff-reported minutes, entered when a request is
        submitted, are the measure of effort.
      </p>
    </Panel>
  );
}
