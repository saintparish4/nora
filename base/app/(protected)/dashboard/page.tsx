'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { useToday } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, EmptyState, ErrorNote } from '@/components/workspace/page-header';
import { PaStatusPill } from '@/components/workspace/status-pill';
import { TaskList } from '@/components/workspace/task-list';

const COUNT_TILES = [
  { key: 'gathering', label: 'Gathering evidence' },
  { key: 'needs_clarification', label: 'Need clarification' },
  { key: 'ready_for_review', label: 'Ready for approval' },
  { key: 'approved', label: 'Ready to submit' },
  { key: 'payer_pending', label: 'With payer', include: ['submitted', 'payer_pending', 'appealed'] },
] as const;

export default function TodayPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useToday();
  const byStatus = data?.counts.by_status ?? {};

  return (
    <div className="pb-16">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {COUNT_TILES.map((tile) => {
          const keys: readonly string[] = 'include' in tile ? tile.include : [tile.key];
          const count = keys.reduce((sum, k) => sum + (byStatus[k] ?? 0), 0);
          return (
            <Link
              key={tile.key}
              href={`/dashboard/prior-authorizations?status=${keys.join(',')}`}
              className="rounded-2xl border border-border bg-card p-4 hover:bg-muted transition-colors"
            >
              <p className="text-3xl font-serif">{isLoading ? '–' : count}</p>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Needs attention">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data && data.needs_attention.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.needs_attention.map(({ kind, reason, action, prior_authorization: pa }) => (
                <li key={`${kind}-${pa.id}`} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {pa.patient.full_name} · {pa.item_name}
                    </p>
                    <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                      <PaStatusPill status={pa.status} />
                      <span>{reason}</span>
                      <span>{pa.coverage.payer.name}</span>
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={`/dashboard/prior-authorizations/${pa.id}`}>{action}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nothing needs you right now.</EmptyState>
          )}
        </Panel>

        <Panel
          title={`My tasks${data ? ` (${data.counts.my_open_tasks})` : ''}`}
          action={<Link href="/dashboard/tasks" className="text-sm underline underline-offset-4">All tasks</Link>}
        >
          {data && data.my_tasks.length > 0 ? (
            <TaskList tasks={data.my_tasks} onChange={() => mutate()} />
          ) : (
            <EmptyState>No open tasks assigned to you.</EmptyState>
          )}
          {data && data.counts.overdue_tasks > 0 && (
            <p className="mt-3 text-sm text-red-700">
              {data.counts.overdue_tasks} overdue task{data.counts.overdue_tasks === 1 ? '' : 's'} across the practice.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
