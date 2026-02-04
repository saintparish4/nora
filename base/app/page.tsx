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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-[2]">
        {/* Navigation */}
        <nav className="flex justify-between items-center py-4 sm:py-6 md:py-8 relative z-10">
          <Link
            href="/"
            className="font-serif text-xl sm:text-2xl italic flex items-center gap-2 sm:gap-3 text-[var(--ink-color)] no-underline"
          >
            <span className="w-px h-5 sm:h-6 bg-[var(--ink-color)] rotate-[15deg]" />
            nora.ai
          </Link>
          <div className="hidden lg:flex gap-6 xl:gap-8">
            <Link
              href="/specialists"
              className="nav-item-underline text-[0.85rem] lg:text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
            >
              Specialists
            </Link>
            <Link
              href="/locations"
              className="nav-item-underline text-[0.85rem] lg:text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
            >
              Locations
            </Link>
            <Link
              href="/technology"
              className="nav-item-underline text-[0.85rem] lg:text-[0.9rem] relative text-[var(--ink-color)] opacity-70 hover:opacity-100 no-underline"
            >
              Technology
            </Link>
          </div>
          <Link
            href="/login"
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.8rem] sm:text-[0.85rem] md:text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Patient Login
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="min-h-[70vh] sm:min-h-[75vh] md:min-h-[80vh] flex flex-col items-center justify-center text-center relative pb-12 sm:pb-16 md:pb-20">
          {/* Beam Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] sm:w-[80px] md:w-[100px] h-[40vh] sm:h-[50vh] md:h-[60vh] -z-[1] pointer-events-none">
            <div className="w-full h-full aura-beam" />
          </div>

          {/* AI Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-[20px] bg-[rgba(255,156,107,0.1)] text-[#C27045] text-[0.65rem] sm:text-xs font-semibold mb-4 sm:mb-5 md:mb-6 border border-[rgba(255,156,107,0.2)]">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[var(--beam-start)] animate-aura-pulse" />
            AI-POWERED DIAGNOSTICS
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] xl:text-[4.5rem] leading-[1.15] sm:leading-[1.1] mb-8 sm:mb-10 md:mb-12 max-w-[90%] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] tracking-[-0.02em] px-2">
            <span className="block text-base sm:text-lg md:text-xl lg:text-2xl font-sans mb-2 sm:mb-3 md:mb-4 tracking-[0.03em] sm:tracking-[0.05em] opacity-70 not-italic">
              Precision Medicine
            </span>
            The clarity of data,<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>the warmth of care.
          </h1>

          {/* Booking Engine */}
          <form className="flex flex-col lg:flex-row items-center bg-[rgba(239,238,236,0.6)] backdrop-blur-[10px] border border-[var(--ink-color)] rounded-2xl sm:rounded-3xl lg:rounded-full p-3 sm:p-4 lg:p-2 max-w-[95%] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] w-full shadow-[0_4px_20px_rgba(0,0,0,0.02)] booking-engine-hover">
            <div className="flex-1 px-4 sm:px-5 lg:px-6 border-r-0 lg:border-r border-[rgba(15,17,21,0.1)] py-3 sm:py-4 lg:py-0 w-full lg:w-auto border-b lg:border-b-0">
              <label className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Condition or Specialty
              </label>
              <input 
                type="text" 
                placeholder="e.g. Cardiology, Dr. Smith" 
                className="w-full bg-transparent border-none font-sans text-sm sm:text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <div className="flex-1 px-4 sm:px-5 lg:px-6 border-r-0 lg:border-r border-[rgba(15,17,21,0.1)] py-3 sm:py-4 lg:py-0 w-full lg:w-auto border-b lg:border-b-0">
              <label className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Location
              </label>
              <input 
                type="text" 
                placeholder="New York, NY" 
                className="w-full bg-transparent border-none font-sans text-sm sm:text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <div className="flex-1 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-0 w-full lg:w-auto">
              <label className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Insurance
              </label>
              <input 
                type="text" 
                placeholder="Select Provider" 
                className="w-full bg-transparent border-none font-sans text-sm sm:text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full lg:w-12 h-11 sm:h-12 rounded-xl lg:rounded-full bg-[var(--ink-color)] border-none text-white flex items-center justify-center cursor-pointer ml-0 lg:ml-2 mt-3 sm:mt-4 lg:mt-0 transition-transform duration-200 hover:scale-105 btn-search-hover"
            >
              <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </form>

          {/* Vertical Divider */}
          <div className="w-px h-12 sm:h-16 md:h-20 bg-[var(--ink-color)] my-6 sm:my-8 md:my-10 opacity-20" />
        </section>

        {/* Stats Strip */}
        <section className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-10 md:gap-16 lg:gap-20 py-6 sm:py-8 md:py-10 border-t border-b border-[var(--glass-border)]">
          <div className="text-center">
            <span className="font-serif text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] lg:text-[2.5rem] block leading-none mb-1 sm:mb-2">98%</span>
            <span className="text-[0.65rem] sm:text-[0.7rem] md:text-xs uppercase tracking-[0.08em] sm:tracking-[0.1em] opacity-60">Diagnostic Accuracy</span>
          </div>
          <div className="text-center">
            <span className="font-serif text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] lg:text-[2.5rem] block leading-none mb-1 sm:mb-2">24/7</span>
            <span className="text-[0.65rem] sm:text-[0.7rem] md:text-xs uppercase tracking-[0.08em] sm:tracking-[0.1em] opacity-60">AI Monitoring</span>
          </div>
          <div className="text-center">
            <span className="font-serif text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] lg:text-[2.5rem] block leading-none mb-1 sm:mb-2">15m</span>
            <span className="text-[0.65rem] sm:text-[0.7rem] md:text-xs uppercase tracking-[0.08em] sm:tracking-[0.1em] opacity-60">Avg Wait Time</span>
          </div>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-10 sm:mt-12 md:mt-16 mb-16 sm:mb-24 md:mb-32">
          <div className="p-5 sm:p-6 md:p-8 border border-[var(--glass-border)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 mb-4 sm:mb-5 md:mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-base sm:text-lg md:text-xl">
              ✦
            </div>
            <h3 className="font-serif text-xl sm:text-[1.35rem] md:text-2xl mb-2 sm:mb-3 italic">Intelligent Triage</h3>
            <p className="text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] leading-[1.5] sm:leading-[1.6] opacity-80">
              Our AI analyzes symptoms in real-time to match you with the precise specialist needed for your condition.
            </p>
          </div>
          
          <div className="p-5 sm:p-6 md:p-8 border border-[var(--glass-border)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 mb-4 sm:mb-5 md:mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-base sm:text-lg md:text-xl">
              ○
            </div>
            <h3 className="font-serif text-xl sm:text-[1.35rem] md:text-2xl mb-2 sm:mb-3 italic">Holistic Records</h3>
            <p className="text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] leading-[1.5] sm:leading-[1.6] opacity-80">
              Seamless integration of your medical history into a unified, secure timeline accessible by your care team.
            </p>
          </div>
          
          <div className="p-5 sm:p-6 md:p-8 border border-[var(--glass-border)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover sm:col-span-2 lg:col-span-1">
            <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 mb-4 sm:mb-5 md:mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-base sm:text-lg md:text-xl">
              →
            </div>
            <h3 className="font-serif text-xl sm:text-[1.35rem] md:text-2xl mb-2 sm:mb-3 italic">Predictive Care</h3>
            <p className="text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] leading-[1.5] sm:leading-[1.6] opacity-80">
              Forward-looking health modeling to prevent conditions before they develop into chronic issues.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
