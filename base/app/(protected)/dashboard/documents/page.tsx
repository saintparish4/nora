import Link from 'next/link';
import { FileText, FileStack, ArrowRight } from 'lucide-react';

const SAMPLE_RECENT = [
  { id: 1, name: 'Visit Summary – Dr. Jenkins', date: 'Jan 20, 2025', type: 'Record' },
  { id: 2, name: 'Lab Results – Metabolic Panel', date: 'Jan 15, 2025', type: 'Record' },
  { id: 3, name: 'Patient Registration Form', date: 'Dec 1, 2024', type: 'Form' },
];

export default function DocumentsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Documents</h1>
      <p className="text-muted-foreground mb-8">Forms and medical records.</p>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/documents/forms"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)] hover:translate-x-1 hover:border-foreground transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Forms</div>
            <div className="text-sm text-muted-foreground">Download or complete forms</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/dashboard/documents/records"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)] hover:translate-x-1 hover:border-foreground transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
            <FileStack className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Medical Records</div>
            <div className="text-sm text-muted-foreground">Access your health records</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent documents */}
      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Recent documents
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_RECENT.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-sm text-muted-foreground">{doc.date}</div>
                </div>
              </div>
              <span className="text-xs py-1 px-2 rounded-full bg-white/80 border border-[var(--glass-border)]">
                {doc.type}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
