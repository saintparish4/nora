import Link from 'next/link';
import { ArrowLeft, FileStack, Download } from 'lucide-react';

const SAMPLE_RECORDS = [
  { id: 1, name: 'Visit Summary – Dr. Sarah Jenkins', date: 'Jan 20, 2025', type: 'Visit summary' },
  { id: 2, name: 'Lab Results – Comprehensive Metabolic Panel', date: 'Jan 15, 2025', type: 'Lab results' },
  { id: 3, name: 'Lab Results – Lipid Panel', date: 'Jan 15, 2025', type: 'Lab results' },
  { id: 4, name: 'Immunization Record', date: 'Dec 5, 2024', type: 'Immunization' },
  { id: 5, name: 'Visit Summary – Dr. Michael Chen', date: 'Nov 28, 2024', type: 'Visit summary' },
  { id: 6, name: 'Radiology Report – Chest X-Ray', date: 'Nov 10, 2024', type: 'Radiology' },
];

export default function DocumentsRecordsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Documents
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Medical Records</h1>
      <p className="text-muted-foreground mb-8">Access your health records.</p>

      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5 flex items-center gap-2">
          <FileStack className="w-4 h-4" /> Your records
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_RECORDS.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                  <FileStack className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{record.name}</div>
                  <div className="text-sm text-muted-foreground">{record.date}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{record.type}</div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
