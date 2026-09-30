import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';

const STEPS = [
  {
    title: 'Start from the order',
    body: 'A clinician has already decided what the patient needs. Nora picks up the prior authorization from there.',
  },
  {
    title: 'Evidence, with citations',
    body: 'Nora checks the chart against the payer criteria and quotes the exact lines that meet each one, or says what is missing.',
  },
  {
    title: 'A person approves',
    body: 'Nothing leaves the practice until staff verify the evidence and a clinician approves the packet.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <NoraLogo href="/" className="font-serif text-2xl italic flex items-center gap-3 text-foreground no-underline" />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="opacity-70 hover:opacity-100">Sign in</Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90"
          >
            Set up your practice
          </Link>
        </nav>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6">
        <section className="py-16 sm:py-24 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Nora Auth · for outpatient practices
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl leading-tight mb-6">
            Healthcare, followed through.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Your clinician decided what needs to happen. Nora gathers the chart evidence a payer
            needs for a prior authorization, shows you what is missing, and prepares the packet
            for a person to approve.
          </p>
        </section>

        <section aria-labelledby="how-heading" className="pb-16">
          <h2 id="how-heading" className="sr-only">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground mb-2">{i + 1}</p>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-10 border-t border-border text-sm text-muted-foreground">
        Nora prepares administrative work for people to review. It does not make clinical or
        coverage decisions.
      </footer>
    </div>
  );
}
