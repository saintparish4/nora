'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { updateTask } from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/workspace/status-pill';
import type { Task } from '@/types';

export function TaskList({ tasks, onChange }: { tasks: Task[]; onChange: () => void }) {
  const close = async (task: Task, status: 'done' | 'dismissed') => {
    try {
      await updateTask(task.id, { status });
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the task');
    }
  };

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => (
        <li key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              {task.subject.type === 'PriorAuthorization' && (
                <Link href={`/dashboard/prior-authorizations/${task.subject.id}`} className="underline underline-offset-2">
                  {task.subject.patient_name} · {task.subject.item_name}
                </Link>
              )}
              {task.assignee && <span>For {task.assignee.name}</span>}
              {task.due_on && <span>Due {formatCalendarDate(task.due_on)}</span>}
              {task.overdue && <Pill tone="danger">Overdue</Pill>}
              {task.status !== 'open' && <Pill tone="neutral">{task.status === 'done' ? 'Done' : 'Dismissed'}</Pill>}
            </p>
          </div>
          {task.status === 'open' && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => close(task, 'done')}>Done</Button>
              <Button size="sm" variant="ghost" onClick={() => close(task, 'dismissed')}>Dismiss</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
