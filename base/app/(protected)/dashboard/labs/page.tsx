import Link from 'next/link';
import { FlaskConical, ArrowRight } from 'lucide-react';

const SAMPLE_LABCORP_RESULTS = [
  { id: 1, name: 'Comprehensive Metabolic Panel', date: 'Jan 15, 2025', status: 'Optimal', statusClass: 'bg-[#E0F2C2]' },
  { id: 2, name: 'Lipid Panel', date: 'Jan 15, 2025', status: 'Within range', statusClass: 'bg-[#E0F2C2]' },
  { id: 3, name: 'Thyroid (TSH)', date: 'Jan 15, 2025', status: 'Normal', statusClass: 'bg-[#E0F2C2]' },
  { id: 4, name: 'Vitamin D, 25-Hydroxy', date: 'Dec 10, 2024', status: 'Low', statusClass: 'bg-[#FFD6C2]' },
];

export default function LabsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Lab Results</h1>
      <p className="text-muted-foreground mb-8">Recent results and updates from Labcorp.</p>

      {/* Labcorp provider card */}
      <div className="rounded-3xl p-6 mb-8 bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
            <FlaskConical className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <div className="font-semibold text-lg">Labcorp</div>
            <div className="text-sm text-muted-foreground">Your results are typically available within 24–48 hours.</div>
          </div>
        </div>
      </div>

      {/* Recent results */}
      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Recent results
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_LABCORP_RESULTS.map((result) => (
            <li key={result.id} className="flex flex-wrap items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <div className="font-medium">{result.name}</div>
                <div className="text-sm text-muted-foreground">{result.date}</div>
              </div>
              <span className={`text-[0.7rem] py-1 px-2.5 rounded-full font-semibold ${result.statusClass}`}>
                {result.status}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/labs/all"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          View all lab results <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
