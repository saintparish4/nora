import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';

const SAMPLE_ALL_LABS = [
  { id: 1, name: 'Comprehensive Metabolic Panel', date: 'Jan 15, 2025', provider: 'Labcorp', status: 'Optimal' },
  { id: 2, name: 'Lipid Panel', date: 'Jan 15, 2025', provider: 'Labcorp', status: 'Within range' },
  { id: 3, name: 'Thyroid (TSH)', date: 'Jan 15, 2025', provider: 'Labcorp', status: 'Normal' },
  { id: 4, name: 'CBC with Differential', date: 'Dec 20, 2024', provider: 'Labcorp', status: 'Normal' },
  { id: 5, name: 'Vitamin D, 25-Hydroxy', date: 'Dec 10, 2024', provider: 'Labcorp', status: 'Low' },
  { id: 6, name: 'HbA1c', date: 'Dec 10, 2024', provider: 'Labcorp', status: 'Optimal' },
  { id: 7, name: 'Cortisol, Serum', date: 'Oct 10, 2024', provider: 'Labcorp', status: 'Elevated' },
  { id: 8, name: 'Basic Metabolic Panel', date: 'Sept 28, 2024', provider: 'Labcorp', status: 'Normal' },
];

export default function LabsAllPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <Link
        href="/dashboard/labs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Lab Results
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">All Lab Results</h1>
      <p className="text-muted-foreground mb-8">Comprehensive lab history from Labcorp.</p>

      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" /> Labcorp
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_ALL_LABS.map((lab) => (
            <li key={lab.id} className="flex flex-wrap items-center justify-between py-4 first:pt-0 last:pb-0 gap-2">
              <div>
                <div className="font-medium">{lab.name}</div>
                <div className="text-sm text-muted-foreground">{lab.date} · {lab.provider}</div>
              </div>
              <span
                className={`text-[0.7rem] py-1 px-2.5 rounded-full font-semibold ${
                  lab.status === 'Low' || lab.status === 'Elevated' ? 'bg-[#FFD6C2]' : 'bg-[#E0F2C2]'
                }`}
              >
                {lab.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
