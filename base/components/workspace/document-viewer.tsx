'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getChartDocument } from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { highlightSegments } from '@/lib/prior-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Shows a chart document's full text with the given ranges highlighted, and
 * scrolls the first highlight into view. This is where a person checks that a
 * citation says what it claims, in context.
 */
export function DocumentViewer({
  documentId,
  highlights = [],
  onClose,
}: {
  documentId: number | null;
  highlights?: Array<[number, number]>;
  onClose: () => void;
}) {
  const { data, error } = useSWR(documentId ? ['chart-document', documentId] : null, () => getChartDocument(documentId as number));
  const markRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center' });
  }, [data]);

  const segments = data?.body ? highlightSegments(data.body, highlights) : [];
  const firstMarkIndex = segments.findIndex((seg) => seg.highlighted);

  return (
    <Dialog open={documentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{data?.title ?? 'Document'}</DialogTitle>
          <DialogDescription>
            {data ? `${data.kind.replaceAll('_', ' ')}${data.occurred_on ? ` · ${formatCalendarDate(data.occurred_on)}` : ''}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-700">Could not load the document.</p>}
        <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border bg-muted/40 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {segments.map((seg, i) => {
              if (!seg.highlighted) return <span key={i}>{seg.text}</span>;
              return (
                <mark key={i} ref={i === firstMarkIndex ? markRef : undefined} className="rounded bg-amber-200 px-0.5">
                  {seg.text}
                </mark>
              );
            })}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
