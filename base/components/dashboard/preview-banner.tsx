import { AlertTriangle } from 'lucide-react';

/**
 * Marks a page as unbuilt sample data.
 *
 * Every page behind NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS renders this first, so a
 * patient looking at fabricated lab values or balances is told so before they
 * read a number. See lib/preview-sections.ts.
 */
export function PreviewBanner({ section }: { section: string }) {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Preview — not your data</p>
        <p className="text-sm">
          {section} is a design preview. Everything below is sample content, not
          your medical record. No {section.toLowerCase()} data is stored yet.
        </p>
      </div>
    </div>
  );
}
