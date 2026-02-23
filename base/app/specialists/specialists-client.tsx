'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { getProviders } from '@/lib/api';
import { SiteFooter } from '@/components/navigation/site-footer';
import type { Provider as ApiProvider, ProvidersResponse } from '@/types';

type SpecialistTag = { label: string; availability?: boolean };

function mapProviderToSpecialist(p: ApiProvider) {
  const rating = typeof p.rating === 'number' ? p.rating : Number(p.rating) || 0;
  const tags: SpecialistTag[] = [];
  if (p.experience_years != null && p.experience_years > 0) {
    tags.push({ label: `${p.experience_years} Years Exp.` });
  }
  if (p.location) tags.push({ label: p.location });
  const hasAvailability = p.has_availability ?? (p.availabilities && p.availabilities.length > 0);
  if (hasAvailability) tags.push({ label: 'Available', availability: true });

  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    rating,
    reviewCount: 0,
    image: p.avatar_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    tags,
    bio: p.bio || '',
    hasBeam: rating >= 4.8,
  };
}

const SPECIALTY_OPTIONS = [
  { value: 'Primary Care', label: 'Primary Care' },
  { value: 'Cardiology', label: 'Cardiologist' },
  { value: 'Ophthalmology', label: 'Ophthalmology' },
  { value: 'Dentistry', label: 'Dentistry' },
  { value: 'Pediatrics', label: 'Pediatrics' },
] as const;

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/** SWR fetcher that returns the full ProvidersResponse */
async function providersFetcher(): Promise<ProvidersResponse> {
  return getProviders();
}

interface SpecialistsClientProps {
  /** Pre-fetched providers from the server component for instant first paint */
  initialData: ProvidersResponse;
}

export default function SpecialistsClient({ initialData }: SpecialistsClientProps) {
  const { data, error, isLoading } = useSWR('providers-list', providersFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allSpecialists = (data?.providers ?? []).map(mapProviderToSpecialist);

  const specialists =
    selectedSpecialties.length === 0
      ? allSpecialists
      : allSpecialists.filter((s) => selectedSpecialties.includes(s.specialty));

  const loading = isLoading && !data;

  function toggleSpecialty(value: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative flex flex-col">
      <div className="noise-overlay" aria-hidden="true" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-[2] flex-1 w-full">
        {/* Navigation */}
        <nav className="flex justify-between items-center py-8 relative z-10" aria-label="Main navigation">
          <NoraLogo className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline" />

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-8">
            <Link
              href="/specialists"
              className="nav-item-underline text-[0.9rem] relative opacity-100 after:!w-full"
              aria-current="page"
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
              className="nav-item-underline text-[0.9rem] relative opacity-70 hover:opacity-100"
            >
              Technology
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden md:inline-block px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
            >
              Patient Login
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-black/5 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span className={`block w-5 h-0.5 bg-[var(--ink-color)] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[var(--ink-color)] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[var(--ink-color)] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border border-[var(--glass-border)] rounded-2xl bg-white/80 backdrop-blur-md p-6 mb-6 space-y-4"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <Link
              href="/specialists"
              className="block text-[var(--ink-color)] font-medium py-2 border-b border-[var(--glass-border)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Specialists
            </Link>
            <Link
              href="/locations"
              className="block text-[var(--ink-color)] opacity-70 py-2 border-b border-[var(--glass-border)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Locations
            </Link>
            <Link
              href="/technology"
              className="block text-[var(--ink-color)] opacity-70 py-2 border-b border-[var(--glass-border)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Technology
            </Link>
            <Link
              href="/login"
              className="block px-5 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] text-center no-underline text-[var(--ink-color)] hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)] transition-all duration-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Patient Login
            </Link>
          </div>
        )}

        {/* Page header */}
        <header className="pt-[60px] pb-10 text-left" id="main-content">
          <h1 className="font-serif text-4xl md:text-[3.5rem] mb-4 tracking-[-0.02em] font-normal">
            Find your care team.
          </h1>
          <p className="text-[1.1rem] opacity-60 max-w-[500px]">
            Browse our network of precision specialists verified by Nora&apos;s
            matching technology.
          </p>
        </header>

        {/* Browse layout: sidebar + grid */}
        <main className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 pb-[100px]">
          {/* Filters sidebar */}
          <aside className="hidden lg:block sticky top-8 h-fit" aria-label="Filter specialists">
            <div className="border-b border-[var(--glass-border)] pb-6 mb-8">
              <h2 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Specialty
              </h2>
              {SPECIALTY_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]"
                >
                  <input
                    type="checkbox"
                    checked={selectedSpecialties.includes(value)}
                    onChange={() => toggleSpecialty(value)}
                    className="w-4 h-4 accent-[var(--ink-color)]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="border-b border-[var(--glass-border)] pb-6 mb-8">
              <h2 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Experience <span className="normal-case opacity-50">(Not Implemented)</span>
              </h2>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                15+ Years
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                10+ Years
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Aura Certified
              </label>
            </div>
            <div className="border-b border-[var(--glass-border)] pb-6 mb-8">
              <h2 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Availability <span className="normal-case opacity-50">(Not Implemented)</span>
              </h2>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Next 48 Hours
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                This Week
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Telehealth
              </label>
            </div>
            <div className="pb-6">
              <h2 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Rating <span className="normal-case opacity-50">(Not Implemented)</span>
              </h2>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                4.8 &amp; above
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                4.5 &amp; above
              </label>
            </div>
          </aside>

          {/* Specialist cards grid */}
          <section
            aria-label="Specialists list"
            aria-live="polite"
            aria-busy={loading}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {loading && (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-2 border-[var(--beam-start)] border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-[var(--ink-color)]/60 text-sm">Loading specialists…</p>
                </div>
              </div>
            )}
            {error && !loading && (
              <div
                className="col-span-full rounded-xl border border-[var(--glass-border)] bg-[rgba(255,255,255,0.4)] p-8 text-center"
                role="alert"
              >
                <p className="text-[var(--ink-color)]/80 mb-2">Could not load specialists.</p>
                <p className="text-sm opacity-60">
                  {error instanceof Error ? error.message : 'Failed to load specialists'}
                </p>
              </div>
            )}
            {!loading && !error && specialists.length === 0 && (
              <div className="col-span-full rounded-xl border border-[var(--glass-border)] bg-[rgba(255,255,255,0.4)] p-8 text-center">
                <p className="text-[var(--ink-color)]/80">No specialists found.</p>
              </div>
            )}
            {!loading &&
              !error &&
              specialists.map((s) => (
                <article
                  key={s.id}
                  className="specialist-card bg-[rgba(255,255,255,0.4)] border border-[var(--glass-border)] rounded-[var(--radius-card)] p-8 transition-all duration-[0.4s] ease-[cubic-bezier(0.165,0.84,0.44,1)] relative overflow-hidden hover:bg-[rgba(255,255,255,0.8)] hover:-translate-y-1 hover:border-[var(--ink-color)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)]"
                >
                  {s.hasBeam && (
                    <div
                      className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] rounded-full pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle, var(--beam-start) 0%, transparent 70%)',
                        opacity: 0.1,
                        filter: 'blur(30px)',
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex gap-5 mb-6">
                    <img
                      src={s.image}
                      alt={`Photo of ${s.name}`}
                      className="w-20 h-20 rounded-full object-cover border border-[var(--glass-border)] bg-gradient-to-br from-[#ddd] to-[#eee]"
                      loading="lazy"
                      width={80}
                      height={80}
                    />
                    <div>
                      <h3 className="font-serif text-2xl mb-1 font-normal">{s.name}</h3>
                      <span className="text-[0.9rem] opacity-60 block mb-2">{s.specialty}</span>
                      <div className="flex items-center gap-1 text-[0.85rem] font-medium">
                        <span aria-hidden="true">✦</span>{' '}
                        <span aria-label={`${s.rating} star rating`}>{s.rating}</span>{' '}
                        <span className="opacity-40 font-normal">({s.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mb-6" role="list" aria-label="Attributes">
                    {s.tags.map((tag, i) => (
                      <span
                        key={i}
                        role="listitem"
                        className={`text-[0.75rem] px-3 py-1 rounded-[var(--radius-pill)] border border-transparent ${
                          tag.availability
                            ? 'bg-[rgba(224,242,194,0.4)] text-[#4a5c2d]'
                            : 'bg-[rgba(15,17,21,0.05)]'
                        }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[0.9rem] leading-[1.5] opacity-70 mb-6">{s.bio}</p>
                  <div className="flex justify-between items-center pt-6 border-t border-[var(--glass-border)]">
                    <Link
                      href={`/dashboard/providers/${s.id}`}
                      className="text-[var(--ink-color)] text-[0.9rem] font-medium no-underline flex items-center gap-2 hover:[&>svg]:translate-x-1 [&>svg]:transition-transform [&>svg]:duration-300"
                    >
                      View Profile <ArrowRightIcon />
                    </Link>
                    <Link
                      href={`/dashboard/get-care?specialty=${encodeURIComponent(s.specialty)}&provider_id=${s.id}`}
                      className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] bg-transparent cursor-pointer transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
                      aria-label={`Book appointment with ${s.name}`}
                    >
                      Book Now
                    </Link>
                  </div>
                </article>
              ))}
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
