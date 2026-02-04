'use client';

import Link from 'next/link';
import { useState } from 'react';

const locations = [
  {
    id: 'central',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Central — Hudson Yards',
    address: '502 10th Ave, New York, NY 10018',
    hours: 'Open 24/7',
    distance: '0.8 miles away',
    services: ['ER', 'Genomics Lab', 'Surgery'],
    markerLabel: 'A1',
    markerStyle: 'default',
  },
  {
    id: 'chelsea',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura West — Chelsea',
    address: '128 W 18th St, New York, NY 10011',
    hours: '8 AM – 8 PM',
    distance: '1.2 miles away',
    services: ['Imaging', 'Mental Health'],
    markerLabel: 'W1',
    markerStyle: 'beam',
  },
  {
    id: 'ues',
    tag: 'Clinic',
    tagStyle: 'default',
    name: 'Aura Upper East Side',
    address: '1100 Park Ave, New York, NY 10128',
    hours: '9 AM – 6 PM',
    distance: '4.5 miles away',
    services: ['Primary Care', 'Dermatology'],
    markerLabel: 'UE',
    markerStyle: 'default',
  },
  {
    id: 'brooklyn',
    tag: 'Specialized Lab',
    tagStyle: 'sage',
    name: 'Aura Brooklyn Heights',
    address: '15 Montague St, Brooklyn, NY 11201',
    hours: '8 AM – 5 PM',
    distance: '6.1 miles away',
    services: ['Cardiology', 'Blood Work'],
    markerLabel: 'Bk',
    markerStyle: 'default',
  },
];

const features = [
  {
    icon: '◎',
    title: 'Virtual First',
    description:
      "Start your consultation from home with our AI triage. We'll direct you to the optimal location only if physical exams are necessary.",
  },
  {
    icon: '◒',
    title: 'Transit Integrated',
    description:
      'Our clinics are strategically located near major transit hubs to minimize travel fatigue for patients and families.',
  },
  {
    icon: '⌾',
    title: 'Facility Safety',
    description:
      'Continuous AI air purification and robotic sanitation protocols ensure the highest level of clinical environment safety.',
  },
];

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function LocationsPage() {
  const [activeId, setActiveId] = useState<string>(locations[0].id);

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
              className="nav-item-underline text-[0.9rem] relative font-semibold opacity-100 after:!w-full"
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
          <Link
            href="/login"
            className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Patient Login
          </Link>
        </nav>

        {/* Page header */}
        <header className="mt-10 mb-[60px] text-left">
          <h1 className="font-serif text-4xl md:text-[3.5rem] mb-4 tracking-[-0.02em] font-normal">
            Our Network
          </h1>
          <p className="text-[1.1rem] opacity-70 max-w-[500px]">
            Find advanced AI-integrated healthcare at one of our flagship
            centers or boutique clinics across the region.
          </p>
        </header>

        {/* Locations layout: list + map */}
        <main className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10 h-auto lg:h-[700px] mb-20">
          <aside
            className="overflow-y-auto pr-3 flex flex-col gap-4 locations-list-scroll"
            role="list"
            aria-label="Locations"
          >
            {locations.map((loc) => (
              <article
                key={loc.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(loc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveId(loc.id);
                  }
                }}
                className={`rounded-[var(--radius-card)] p-6 cursor-pointer transition-all duration-300 relative border bg-[rgba(255,255,255,0.4)] border-[var(--glass-border)] hover:bg-white hover:border-[var(--ink-color)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-color)] focus-visible:ring-offset-2 ${
                  activeId === loc.id
                    ? 'bg-white border-[var(--ink-color)] -translate-y-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
                    : ''
                }`}
              >
                <span
                  className="text-[0.7rem] uppercase tracking-[0.05em] text-white px-2 py-0.5 rounded inline-block mb-3"
                  style={{
                    background:
                      loc.tagStyle === 'beam'
                        ? 'var(--beam-start)'
                        : loc.tagStyle === 'sage'
                          ? '#8e9e72'
                          : 'var(--ink-color)',
                  }}
                >
                  {loc.tag}
                </span>
                <h3 className="font-serif text-[1.4rem] font-normal mb-2">
                  {loc.name}
                </h3>
                <div className="text-[0.9rem] leading-relaxed opacity-70 mb-4">
                  {loc.address}
                  <br />
                  {loc.hours} • {loc.distance}
                </div>
                <div className="flex flex-wrap gap-2">
                  {loc.services.map((s) => (
                    <span
                      key={s}
                      className="text-[0.75rem] px-2.5 py-1 border border-[var(--glass-border)] rounded-[var(--radius-pill)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </aside>

          <section
            className="rounded-[var(--radius-card)] overflow-hidden relative border border-[var(--glass-border)] bg-[#e5e5f7] min-h-[400px] lg:min-h-0 order-first lg:order-none"
            style={{
              backgroundImage:
                'radial-gradient(var(--glass-border) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            aria-label="Map"
          >
            {/* Placeholder markers */}
            <div
              className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.2)] rotate-[-45deg] top-[30%] left-[45%]"
              style={{ background: 'var(--ink-color)', borderRadius: '50% 50% 50% 0' }}
              aria-hidden
            >
              <span className="rotate-45">A1</span>
            </div>
            <div
              className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.2)] rotate-[-45deg] top-[55%] left-[35%]"
              style={{
                background: 'var(--beam-start)',
                borderRadius: '50% 50% 50% 0',
              }}
              aria-hidden
            >
              <span className="rotate-45">W1</span>
            </div>
            <div
              className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.2)] rotate-[-45deg] top-[20%] left-[70%]"
              style={{ background: 'var(--ink-color)', borderRadius: '50% 50% 50% 0' }}
              aria-hidden
            >
              <span className="rotate-45">UE</span>
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <button
                type="button"
                className="w-10 h-10 bg-white border border-[var(--glass-border)] rounded-lg flex items-center justify-center text-[1.2rem] cursor-pointer hover:bg-[var(--bg-color)] transition-colors"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                className="w-10 h-10 bg-white border border-[var(--glass-border)] rounded-lg flex items-center justify-center text-[1.2rem] cursor-pointer hover:bg-[var(--bg-color)] transition-colors"
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="w-10 h-10 bg-white border border-[var(--glass-border)] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--bg-color)] transition-colors"
                aria-label="Map settings"
              >
                <SettingsIcon />
              </button>
            </div>
          </section>
        </main>

        {/* Features strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-8 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.3)] feature-card-hover"
            >
              <div className="w-10 h-10 mb-6 flex items-center justify-center text-xl text-[var(--ink-color)]">
                {f.icon}
              </div>
              <h3 className="font-serif text-2xl font-normal mb-3">
                {f.title}
              </h3>
              <p className="text-[0.95rem] leading-relaxed opacity-80">
                {f.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
