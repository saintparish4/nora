import Link from 'next/link';
import { Pill, ArrowRight } from 'lucide-react';

const SAMPLE_MEDICATIONS = [
  { id: 1, name: 'Atorvastatin', dose: '10 mg', frequency: 'Once daily', indication: 'Lipid control', time: '08:00 AM', refills: 3 },
  { id: 2, name: 'Vitamin D3', dose: '2000 IU', frequency: 'Once daily', indication: 'Supplementation', time: '08:00 AM', refills: 5 },
  { id: 3, name: 'Magnesium Glycinate', dose: '200 mg', frequency: 'Once daily at bedtime', indication: 'Muscle recovery', time: '09:00 PM', refills: 2 },
  { id: 4, name: 'Lisinopril', dose: '5 mg', frequency: 'Once daily', indication: 'Blood pressure', time: '07:00 AM', refills: 1 },
];

export default function MedicationsPage() {
  return (
    <div className="p-4 lg:p-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Medications</h1>
      <p className="text-muted-foreground mb-8">Active medications and details.</p>

      <div className="rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          Active medications
        </div>
        <ul className="divide-y divide-[var(--glass-border)]">
          {SAMPLE_MEDICATIONS.map((med) => (
            <li key={med.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-[var(--glass-border)] flex items-center justify-center">
                <Pill className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{med.name}</div>
                <div className="text-sm text-muted-foreground">
                  {med.dose} · {med.frequency}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{med.indication}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium opacity-80">{med.time}</span>
                <span className="text-xs py-1 px-2 rounded-full bg-white/80 border border-[var(--glass-border)]">
                  {med.refills} refill{med.refills !== 1 ? 's' : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/medications/refills"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          Request refills <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
