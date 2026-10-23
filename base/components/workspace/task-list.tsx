'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { askPrescriber, updateTask } from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/workspace/page-header';
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

  // Records that staff asked; the task stays open with them and nothing waits on it.
  const ask = async (task: Task) => {
    try {
      await askPrescriber(task.id);
      toast.success("Noted: asked the prescriber's office");
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record that');
    }
  };

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Card className="p-4">
            <p className="text-sm leading-relaxed text-ink">{task.title}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {task.subject.type === 'PriorAuthorization' && (
                <Link href={`/dashboard/prior-authorizations/${task.subject.id}`} className="font-medium text-blue-deep hover:underline">
                  {task.subject.patient_name} · {task.subject.item_name}
                </Link>
              )}
              {task.assignee && <span>For {task.assignee.name}</span>}
              {task.due_on && <span>Due {formatCalendarDate(task.due_on)}</span>}
              {task.overdue && <Pill tone="danger">Overdue</Pill>}
              {task.asked_prescriber_at && <Pill tone="info">Asked the prescriber&apos;s office {formatCalendarDate(task.asked_prescriber_at)}</Pill>}
              {task.status !== 'open' && <Pill tone="neutral">{task.status === 'done' ? 'Done' : 'Dismissed'}</Pill>}
            </p>
            {task.status === 'open' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => close(task, 'done')}>Done</Button>
                {!task.asked_prescriber_at && (
                  <Button size="sm" variant="outline" onClick={() => ask(task)}>Ask the prescriber&apos;s office</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => close(task, 'dismissed')}>Dismiss</Button>
              </div>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
