'use client';

import Link from 'next/link';

const researchItems = [
  { title: 'Genomic Variability in AI Triage', source: 'Nature Medicine, 2023' },
  { title: 'Predictive Cardiology Models', source: 'Journal of AI Health, 2024' },
  { title: 'Ethical AI in Patient Care', source: 'Stanford Bioethics, 2023' },
  { title: 'Neural Synthesis for Oncology', source: 'Lancet Digital Health, 2024' },
];

const nodes = [
  { label: 'DNA', active: true },
  { label: 'LABS', active: false },
  { label: 'VITAL', active: true },
  { label: 'HIS', active: false },
  { label: 'IMG', active: true },
  { label: 'ENV', active: false },
];

export default function TechnologyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative">
      <div className="noise-overlay" />
      <div
        className="fixed -top-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full pointer-events-none -z-[1]"
        style={{
          background:
            'radial-gradient(circle, rgba(224,242,194,0.3) 0%, rgba(255,156,107,0) 70%)',
          filter: 'blur(60px)',
        }}
        aria-hidden
      />

      <div className="max-w-[1200px] mx-auto px-6 relative z-[2]">
        {/* Navigation */}
        <nav className="flex justify-between items-center py-8 relative z-10">
          <Link
            href="/"
            className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline"
          >
            <span className="w-px h-6 bg-[var(--ink-color)] rotate-[15deg]" />
            nora.ai
          </Link>
          <div className="hidden md:flex gap-8">
            <Link
              href="/specialists"
              className="nav-item-underline text-[0.9rem] relative opacity-70 hover:opacity-100"
            >
              Specialists
            </Link>
            <Link
              href="/locations"
              className="nav-item-underline text-[0.9rem] relative opacity-70 hover:opacity-100"
            >
              Locations
            </Link>
            <Link
              href="/technology"
              className="nav-item-underline text-[0.9rem] relative font-semibold opacity-100 after:!w-full"
            >
              Technology
            </Link>
          </div>
          <Link
            href="/login"
            className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Patient Login
          </Link>
        </nav>

        {/* Hero */}
        <section className="py-[120px] md:py-[120px] pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[20px] bg-[rgba(255,156,107,0.1)] text-[#C27045] text-[0.75rem] font-semibold mb-6 border border-[rgba(255,156,107,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[var(--beam-start)] animate-aura-pulse" />
            CORE ARCHITECTURE
          </div>
          <h1 className="font-serif text-4xl md:text-[4.5rem] mb-6 tracking-[-0.02em] font-normal">
            Synthesized Intelligence
          </h1>
          <p className="text-xl max-w-[600px] mx-auto opacity-70 leading-relaxed">
            Where biological intuition meets computational rigor. Explore the
            neural framework behind Aura&apos;s diagnostic engine.
          </p>
        </section>

        {/* Diagram section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center py-20">
          <div className="relative h-[500px] bg-[rgba(255,255,255,0.2)] rounded-[var(--radius-card)] border border-[var(--glass-border)] flex items-center justify-center overflow-hidden">
            <div className="tech-beam" aria-hidden />
            <div className="relative z-[2] grid grid-cols-3 gap-5">
              {nodes.map((n) => (
                <div
                  key={n.label}
                  className={`w-[60px] h-[60px] rounded-full border border-[var(--ink-color)] flex items-center justify-center text-[0.8rem] bg-[var(--bg-color)] shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${
                    n.active
                      ? 'bg-[var(--ink-color)] text-[var(--bg-color)] border-[var(--ink-color)]'
                      : ''
                  }`}
                >
                  {n.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-serif text-[2.5rem] md:text-[3rem] mb-6 tracking-[-0.02em] font-normal">
              The Multimodal Engine
            </h2>
            <p className="text-[1.1rem] leading-[1.7] opacity-80 mb-8">
              Unlike traditional AI which analyzes data in silos, Aura&apos;s
              engine utilizes cross-domain synthesis. It simultaneously
              cross-references genomic sequences, longitudinal lab results, and
              real-time biometric streams to identify patterns invisible to the
              human eye.
            </p>
            <span className="inline-block px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] cursor-pointer transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]">
              Read Whitepaper
            </span>
          </div>
        </section>

        {/* Innovation grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 my-20">
          <div className="p-12 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.4)]">
            <span className="text-[0.7rem] tracking-[0.1em] uppercase opacity-50 block mb-4">
              Diagnostic Accuracy
            </span>
            <h3 className="font-serif text-3xl mb-5 font-normal">
              Neural Pattern Matching
            </h3>
            <p className="leading-relaxed opacity-80 mb-6">
              Our proprietary algorithm, Aura-Net, has been trained on over 40
              million clinical episodes, achieving a 98.4% accuracy rate in
              early-stage oncology detection.
            </p>
            <span className="font-serif text-[2.5rem]">98.4%</span>
          </div>
          <div className="p-12 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.4)]">
            <span className="text-[0.7rem] tracking-[0.1em] uppercase opacity-50 block mb-4">
              Data Ethics
            </span>
            <h3 className="font-serif text-3xl mb-5 font-normal">
              Privacy-First Compute
            </h3>
            <p className="leading-relaxed opacity-80 mb-6">
              We utilize federated learning and zero-knowledge proofs, ensuring
              your medical data never leaves the local encryption layer while
              still contributing to global health insights.
            </p>
            <span className="font-serif text-[2.5rem]">AES-256</span>
          </div>
        </section>

        {/* Research strip */}
        <section className="py-[100px] border-t border-[var(--glass-border)] text-center">
          <h2 className="font-serif text-[2rem] md:text-[2.5rem] mb-3 tracking-[-0.02em] font-normal">
            Peer-Reviewed Foundations
          </h2>
          <p className="opacity-60 mb-[60px]">
            Collaborating with the world&apos;s leading medical institutions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-0">
            {researchItems.map((item) => (
              <div
                key={item.title}
                className="text-left p-6 border-l border-[var(--ink-color)]"
              >
                <h4 className="font-sans font-semibold text-[0.9rem] mb-2">
                  {item.title}
                </h4>
                <span className="text-[0.8rem] opacity-60">{item.source}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-[120px] text-center bg-gradient-to-b from-transparent to-[rgba(224,242,194,0.2)] rounded-[40px_40px_0_0]">
          <h2 className="font-serif text-3xl md:text-[3.5rem] mb-8 tracking-[-0.02em] font-normal">
            Ready to see the <i>future</i> of care?
          </h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline bg-[var(--ink-color)] text-[var(--bg-color)] transition-all duration-300 hover:opacity-90"
            >
              Book a Consultation
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
            >
              Partner with Us
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-[60px] border-t border-[var(--glass-border)] flex flex-col sm:flex-row justify-between items-center gap-4 text-[0.8rem] opacity-60">
          <div>© 2024 Aura Health AI. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/" className="text-inherit no-underline hover:opacity-80">
              Privacy Policy
            </Link>
            <Link href="/" className="text-inherit no-underline hover:opacity-80">
              HIPAA Compliance
            </Link>
            <Link href="/" className="text-inherit no-underline hover:opacity-80">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
