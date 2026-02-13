import Link from 'next/link';
import { ArrowLeft, Pill, Send } from 'lucide-react';

const SAMPLE_REFILL_REQUESTS = [
  { id: 1, name: 'Lisinopril', dose: '5 mg', requested: 'Feb 10, 2025', status: 'Sent to pharmacy' },
  { id: 2, name: 'Magnesium Glycinate', dose: '200 mg', requested: 'Jan 28, 2025', status: 'Filled' },
];

export default function MedicationsRefillsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <Link
        href="/dashboard/medications"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Medications
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Refill Requests</h1>
      <p className="text-muted-foreground mb-8">Request refills for your medications.</p>

      {/* Request refill CTA */}
      <div className="rounded-3xl p-6 mb-8 bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
            <Send className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">Need a refill?</div>
            <div className="text-sm text-muted-foreground">Request a refill and we’ll send it to your pharmacy.</div>
          </div>
          <button
            type="button"
            className="ml-auto px-4 py-2 rounded-xl bg-[var(--ink-color)] text-white text-sm font-medium hover:opacity-90 transition"
          >
            Request refill
          </button>
        </div>
      </div>

      {/* Recent refill requests */}
      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Recent refill requests
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_REFILL_REQUESTS.map((req) => (
            <li key={req.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                <Pill className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{req.name} {req.dose}</div>
                <div className="text-sm text-muted-foreground">Requested {req.requested}</div>
              </div>
              <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#E0F2C2] font-semibold">
                {req.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
