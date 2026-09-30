'use client';

import { useState } from 'react';
import { useTasks } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, EmptyState, ErrorNote } from '@/components/workspace/page-header';
import { TaskList } from '@/components/workspace/task-list';

const VIEWS = [
  { key: 'mine', label: 'Mine', params: { status: 'open', mine: true } },
  { key: 'open', label: 'All open', params: { status: 'open' } },
  { key: 'done', label: 'Done', params: { status: 'done' } },
] as const;

export default function TasksPage() {
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('mine');
  const params = VIEWS.find((v) => v.key === view)!.params;
  const { data, error, isLoading, mutate } = useTasks(params);

  return (
    <div className="pb-16 max-w-4xl">
      <PageHeader title="Tasks" subtitle="Follow-ups Nora opened when a requirement was missing or unclear." />
      <div className="mb-4 flex gap-2">
        {VIEWS.map((v) => (
          <Button key={v.key} size="sm" variant={view === v.key ? 'default' : 'outline'} onClick={() => setView(v.key)}>
            {v.label}
          </Button>
        ))}
      </div>
      <Panel>
        <ErrorNote error={error} />
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data && data.tasks.length > 0 ? (
          <TaskList tasks={data.tasks} onChange={() => mutate()} />
        ) : (
          <EmptyState>No tasks here.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
