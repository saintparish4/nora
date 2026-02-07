'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';

const SPECIALTY_REQUIRED_ERROR = 'Please enter a specialty to search for specialists (e.g. primary care, cardiology, pediatrics).';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [insurance, setInsurance] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = specialty.trim();
    if (!trimmed) {
      setSearchError(SPECIALTY_REQUIRED_ERROR);
      return;
    }
    setSearchError(null);
    const params = new URLSearchParams();
    params.set('specialty', trimmed);
    if (location.trim()) params.set('location', location.trim());
    if (insurance.trim()) params.set('insurance', insurance.trim());
    router.push(`/specialists?${params.toString()}`);
  }

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
          <NoraLogo />
          <div className="hidden lg:flex gap-6 xl:gap-8 absolute left-1/2 -translate-x-1/2">
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
              SymptomX
            </Link>
          </div>
          <Link
            href="/login"
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Patient Login
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="min-h-[70vh] sm:min-h-[75vh] md:min-h-[80vh] flex flex-col items-center justify-center text-center relative pt-8 sm:pt-12 md:pt-16 pb-12 sm:pb-16 md:pb-20">
          {/* Beam Effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] sm:w-[80px] md:w-[100px] h-[40vh] sm:h-[50vh] md:h-[60vh] -z-[1] pointer-events-none">
            <div className="w-full h-full aura-beam" />
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] xl:text-[4.5rem] leading-[1.15] sm:leading-[1.1] mb-4 sm:mb-5 md:mb-6 max-w-[90%] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] tracking-[-0.02em] px-2">
            <span className="block text-base sm:text-lg md:text-xl lg:text-2xl font-sans mb-2 sm:mb-3 md:mb-4 tracking-[0.03em] sm:tracking-[0.05em] opacity-70 not-italic">
              The AI Assistant That Acts
            </span>
            From symptoms to specialist,<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>one seamless step.
          </h1>

          {/* Subheadline */}
          <p className="text-[0.85rem] sm:text-[0.95rem] md:text-base leading-[1.6] sm:leading-[1.7] opacity-70 max-w-[90%] sm:max-w-[480px] md:max-w-[540px] mb-8 sm:mb-10 md:mb-12 px-2">
            We don't just interpret your symptoms—we match you to the right specialist and book the visit.
          </p>

          {/* Search Engine */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col lg:flex-row items-center bg-[rgba(239,238,236,0.6)] backdrop-blur-[10px] border border-[var(--ink-color)] rounded-2xl sm:rounded-3xl lg:rounded-full p-3 sm:p-4 lg:p-2 w-full max-w-[95%] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] mx-auto shadow-[0_4px_20px_rgba(0,0,0,0.02)] booking-engine-hover"
            noValidate
          >
            <div className="flex-1 px-4 sm:px-5 lg:px-6 border-r-0 lg:border-r border-[rgba(15,17,21,0.1)] py-3 sm:py-4 lg:py-0 w-full lg:w-auto border-b lg:border-b-0">
              <label htmlFor="home-specialty" className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Specialty
              </label>
              <input
                id="home-specialty"
                type="text"
                placeholder="e.g. Primary care, Cardiology, Pediatrics"
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  if (searchError) setSearchError(null);
                }}
                aria-invalid={!!searchError}
                aria-describedby={searchError ? 'home-search-error' : undefined}
                className="w-full bg-transparent border-none font-sans text-sm sm:text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>

            <div className="flex-1 px-4 sm:px-5 lg:px-6 border-r-0 lg:border-r border-[rgba(15,17,21,0.1)] py-3 sm:py-4 lg:py-0 w-full lg:w-auto border-b lg:border-b-0">
              <label htmlFor="home-location" className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Location
              </label>
              <input
                id="home-location"
                type="text"
                placeholder="New York, NY"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent border-none font-sans text-sm sm:text-base text-[var(--ink-color)] outline-none placeholder:text-[rgba(15,17,21,0.3)]"
              />
            </div>

            <div className="flex-1 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-0 w-full lg:w-auto">
              <label htmlFor="home-insurance" className="block text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.05em] text-[rgba(15,17,21,0.5)] mb-0.5 sm:mb-1">
                Insurance
              </label>
              <input
                id="home-insurance"
                type="text"
                placeholder="Select Provider"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
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
          {searchError && (
            <p id="home-search-error" role="alert" className="mt-3 text-sm font-sans max-w-[95%] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] w-full text-center text-[var(--color-destructive)]">
              {searchError}
            </p>
          )}

          {/* Horizontal Divider */}
          <div className="w-px h-12 sm:h-16 md:h-20 bg-[var(--ink-color)] my-6 sm:my-8 md:my-10 opacity-20" />
        </section>
      </div>

      {/* Trusted by - logo carousel, full-bleed lines */}
      <div className="w-screen relative left-1/2 -translate-x-1/2 border-t border-b border-[var(--glass-border)] overflow-hidden min-h-[180px] sm:min-h-[200px] flex flex-col justify-center">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 w-full flex flex-col items-center justify-center">
          <p className="text-center text-[0.65rem] sm:text-[0.7rem] md:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] opacity-60 mb-6 sm:mb-8">
            Trusted by Top Health Systems
          </p>
          <div className="flex overflow-hidden w-full">
            <div className="flex shrink-0 animate-logo-marquee items-center gap-12 sm:gap-16 md:gap-20 lg:gap-24">
              {(() => {
                const partners = [
                  { name: 'Baylor Scott & White', logo: '/logos/Baylor_Scott__White_Logo.png' },
                  { name: 'BAuA', logo: '/logos/Bundesanstalt_fur_Arbeitsschutz_und_Arbeitsmedizin_Logo.png' },
                  { name: 'Capsule Pharmacy', logo: '/logos/Capsule_Pharmacy_Logo-s640.png' },
                  { name: 'Dubai Cares', logo: '/logos/Dubai_Cares_Logo.png' },
                  { name: 'Exact Sciences', logo: '/logos/Exact_Sciences_Logo-s640.png' },
                  { name: 'Forma Inc.', logo: '/logos/Forma_Inc._Logo.png' },
                  { name: 'Labcorp', logo: '/logos/Laboratory_Corporation_of_America_Holdings_Logo.png' },
                  { name: 'Montefiore', logo: '/logos/mhs-montefiore-new-rochelle.png' },
                  { name: 'Mount Sinai', logo: '/logos/mount-sinai.png' },
                  { name: 'Nano X Imaging', logo: '/logos/Nano_X_Imaging_Logo-s640.png' },
                  { name: 'Reproductive Biology Associates', logo: '/logos/Reproductive_Biology_Associates_Logo.png' },
                  { name: 'Summit Health', logo: '/logos/Summit_Health_Logo-s640.png' },
                  { name: 'Synthego', logo: '/logos/Synthego_Logo.png' },
                ];
                const logoClass = 'h-full w-auto max-w-[200px] sm:max-w-[240px] md:max-w-[280px] object-contain object-center';
                const cellClass = 'shrink-0 flex items-center justify-center h-12 sm:h-14 md:h-16 lg:h-20 text-[var(--ink-color)] opacity-50 font-serif italic whitespace-nowrap';
                return (
                  <>
                    <div className="flex shrink-0 items-center gap-12 sm:gap-16 md:gap-20 lg:gap-24" aria-hidden={false}>
                      {partners.map((item) => (
                        <div key={item.name} className={cellClass}>
                          <img src={item.logo} alt={item.name} className={logoClass} />
                        </div>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-12 sm:gap-16 md:gap-20 lg:gap-24" aria-hidden>
                      {partners.map((item) => (
                        <div key={item.name} className={cellClass}>
                          <img src={item.logo} alt="" className={logoClass} />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-[2]">
        {/* Features Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mt-10 sm:mt-12 md:mt-16 mb-16 sm:mb-24 md:mb-32">
          <div className="p-5 sm:p-6 md:p-8 border border-[var(--glass-border)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 mb-4 sm:mb-5 md:mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-base sm:text-lg md:text-xl">
              ✦
            </div>
            <h3 className="font-serif text-xl sm:text-[1.35rem] md:text-2xl mb-2 sm:mb-3 italic">Symptom Intelligence</h3>
            <p className="text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] leading-[1.5] sm:leading-[1.6] opacity-80">
              Our AI analyzes your symptoms in real-time, matching you with the right specialist — not just a list of providers, but the precise care you need.
            </p>
          </div>

          <div className="p-5 sm:p-6 md:p-8 border border-[var(--glass-border)] rounded-[16px] sm:rounded-[20px] md:rounded-[24px] bg-[rgba(255,255,255,0.3)] feature-card-hover">
            <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 mb-4 sm:mb-5 md:mb-6 flex items-center justify-center border border-[var(--ink-color)] rounded-full text-base sm:text-lg md:text-xl">
              →
            </div>
            <h3 className="font-serif text-xl sm:text-[1.35rem] md:text-2xl mb-2 sm:mb-3 italic">Seamless Booking</h3>
            <p className="text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] leading-[1.5] sm:leading-[1.6] opacity-80">
              Based on your symptom analysis, we connect you directly with the right provider and book your appointment — no guesswork, no endless searching.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
