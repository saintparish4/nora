import Link from 'next/link';
import { FileText, Download, ArrowRight } from 'lucide-react';

const SAMPLE_STATEMENTS = [
  { id: 1, period: 'January 2025', date: 'Feb 1, 2025', amount: 245.0, status: 'Paid' },
  { id: 2, period: 'December 2024', date: 'Jan 2, 2025', amount: 189.5, status: 'Paid' },
  { id: 3, period: 'November 2024', date: 'Dec 1, 2024', amount: 312.0, status: 'Paid' },
];

export default function BillingPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Billing</h1>
      <p className="text-muted-foreground mb-8">Statements and balances.</p>

      {/* Current balance */}
      <div className="rounded-3xl p-6 mb-8 bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)] max-w-md">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-2">
          Current balance
        </div>
        <div className="font-serif text-3xl mb-1">$0.00</div>
        <p className="text-sm text-muted-foreground">No outstanding balance. Next statement: Mar 1, 2025.</p>
      </div>

      {/* Statements */}
      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Recent statements
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_STATEMENTS.map((stmt) => (
            <li key={stmt.id} className="flex flex-wrap items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{stmt.period}</div>
                  <div className="text-sm text-muted-foreground">Issued {stmt.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="font-semibold">${stmt.amount.toFixed(2)}</span>
                <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#E0F2C2] font-semibold">
                  {stmt.status}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                >
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/billing/payments"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          View payment history <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
