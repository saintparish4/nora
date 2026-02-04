'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--beam-start)] border-t-transparent rounded-full animate-spin" />
          <div className="text-[var(--ink-color)]/50 text-sm font-sans">Loading...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative">
      {/* Noise Overlay */}
      <div className="noise-overlay" />

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
              className="nav-item-underline text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
            >
              Specialists
            </Link>
            <Link
              href="/locations"
              className="nav-item-underline text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
            >
              Locations
            </Link>
            <Link
              href="/technology"
              className="nav-item-underline text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
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

        {/* Hero Section */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center text-center relative pb-20">
          {/* Beam Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[60vh] -z-[1] pointer-events-none">
            <div className="w-full h-full aura-beam" />
          </div>

          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[20px] bg-[rgba(255,156,107,0.1)] text-[#C27045] text-xs font-semibold mb-6 border border-[rgba(255,156,107,0.2)]">
            <div className="w-2 h-2 rounded-full bg-[var(--beam-start)] animate-aura-pulse" />
            AI-POWERED DIAGNOSTICS
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-[4.5rem] leading-[1.1] mb-12 max-w-[800px] tracking-[-0.02em]">
            <span className="block text-xl md:text-2xl font-sans mb-4 tracking-[0.05em] opacity-70 not-italic">
              Precision Medicine
            </span>
            The clarity of data,<br />the warmth of care.
          </h1>

          {/* Booking Engine */}
          <form className="flex flex-col md:flex-row items-center bg-[rgba(239,238,236,0.6)] backdrop-blur-[10px] border border-[var(--ink-color)] rounded-full md:rounded-full p-2 md:p-2 max-w-[700px] w-full shadow-[0_4px_20px_rgba(0,0,0,0.02)] booking-engine-hover">
            <div className="flex-1 px-6 border-r-0 md:border-r border-[rgba(15,17,21,0.1)] py-4 md:py-0 w-full md:w-auto border-b md:border-b-0">
              <label className="block text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-1">
                Condition or Specialty
              </label>
              <input 
                type="text" 
                placeholder="e.g. Cardiology, Dr. Smith" 
                className="w-full bg-transparent border-none font-sans text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <div className="flex-1 px-6 border-r-0 md:border-r border-[rgba(15,17,21,0.1)] py-4 md:py-0 w-full md:w-auto border-b md:border-b-0">
              <label className="block text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-1">
                Location
              </label>
              <input 
                type="text" 
                placeholder="New York, NY" 
                className="w-full bg-transparent border-none font-sans text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <div className="flex-1 px-6 py-4 md:py-0 w-full md:w-auto">
              <label className="block text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-1">
                Insurance
              </label>
              <input 
                type="text" 
                placeholder="Select Provider" 
                className="w-full bg-transparent border-none font-sans text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-12 h-12 rounded-xl md:rounded-full bg-[var(--ink-color)] border-none text-white flex items-center justify-center cursor-pointer ml-0 md:ml-2 mt-4 md:mt-0 transition-transform duration-200 hover:scale-105 btn-search-hover"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </form>

          {/* Vertical Divider */}
          <div className="w-px h-20 bg-[var(--ink-color)] my-10 opacity-20" />
        </section>

        {/* Stats Strip */}
        <section className="flex flex-col md:flex-row justify-center gap-10 md:gap-20 py-10 border-t border-b border-[var(--glass-border)]">
          <div className="text-center">
            <span className="font-serif text-[2.5rem] block leading-none mb-2">98%</span>
            <span className="text-xs uppercase tracking-[0.1em] opacity-60">Diagnostic Accuracy</span>
          </div>
          <div className="text-center">
            <span className="font-serif text-[2.5rem] block leading-none mb-2">24/7</span>
            <span className="text-xs uppercase tracking-[0.1em] opacity-60">AI Monitoring</span>
          </div>
          <div className="text-center">
            <span className="font-serif text-[2.5rem] block leading-none mb-2">15m</span>
            <span className="text-xs uppercase tracking-[0.1em] opacity-60">Avg Wait Time</span>
          </div>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 mb-32">
          <div className="p-8 border border-[var(--glass-border)] rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-10 h-10 mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-xl">
              ✦
            </div>
            <h3 className="font-serif text-2xl mb-3 italic">Intelligent Triage</h3>
            <p className="text-[0.95rem] leading-[1.6] opacity-80">
              Our AI analyzes symptoms in real-time to match you with the precise specialist needed for your condition.
            </p>
          </div>
          
          <div className="p-8 border border-[var(--glass-border)] rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-10 h-10 mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-xl">
              ○
            </div>
            <h3 className="font-serif text-2xl mb-3 italic">Holistic Records</h3>
            <p className="text-[0.95rem] leading-[1.6] opacity-80">
              Seamless integration of your medical history into a unified, secure timeline accessible by your care team.
            </p>
          </div>
          
          <div className="p-8 border border-[var(--glass-border)] rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-10 h-10 mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-xl">
              →
            </div>
            <h3 className="font-serif text-2xl mb-3 italic">Predictive Care</h3>
            <p className="text-[0.95rem] leading-[1.6] opacity-80">
              Forward-looking health modeling to prevent conditions before they develop into chronic issues.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
