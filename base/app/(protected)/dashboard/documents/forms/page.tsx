import Link from 'next/link';
import { ArrowLeft, FileText, Download } from 'lucide-react';

const SAMPLE_FORMS = [
  { id: 1, name: 'Patient Registration Form', description: 'New patient intake and demographics', updated: 'Dec 1, 2024' },
  { id: 2, name: 'Authorization for Release of Medical Records', description: 'HIPAA-compliant release form', updated: 'Nov 15, 2024' },
  { id: 3, name: 'Consent for Treatment', description: 'General consent and privacy notice', updated: 'Nov 15, 2024' },
  { id: 4, name: 'Insurance Verification Form', description: 'Primary and secondary insurance details', updated: 'Oct 20, 2024' },
];

export default function DocumentsFormsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Documents
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Forms</h1>
      <p className="text-muted-foreground mb-8">Download or complete forms.</p>

      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Available forms
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_FORMS.map((form) => (
            <li key={form.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{form.name}</div>
                  <div className="text-sm text-muted-foreground">{form.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Updated {form.updated}</div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
              >
                <Download className="w-4 h-4" /> PDF
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
