import Link from 'next/link';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';

const SAMPLE_PAYMENTS = [
  { id: 1, date: 'Feb 5, 2025', amount: 245.0, method: 'Visa •••• 4242', status: 'Completed' },
  { id: 2, date: 'Jan 8, 2025', amount: 189.5, method: 'Visa •••• 4242', status: 'Completed' },
  { id: 3, date: 'Dec 3, 2024', amount: 312.0, method: 'Visa •••• 4242', status: 'Completed' },
];

export default function BillingPaymentsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <Link
        href="/dashboard/billing"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Billing
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Payments</h1>
      <p className="text-muted-foreground mb-8">Make a payment or view history.</p>

      {/* Payment method */}
      <div className="rounded-3xl p-6 mb-8 bg-white/60 backdrop-blur-[10px] border border-[var(--glass-border)] max-w-md">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-3">
          Default payment method
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">Visa •••• 4242</div>
            <div className="text-sm text-muted-foreground">Expires 08/26</div>
          </div>
          <button
            type="button"
            className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Update
          </button>
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Payment history
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_PAYMENTS.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#E0F2C2]" />
                <div>
                  <div className="font-medium">${payment.amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{payment.date} · {payment.method}</div>
                </div>
              </div>
              <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#E0F2C2] font-semibold">
                {payment.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
