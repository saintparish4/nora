'use client';

import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { useState } from 'react';
import LocationsMap from './locations-map';

const locations = [
  // ── New York — Manhattan ──────────────────────────────────────
  {
    id: 'central',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Central — Hudson Yards',
    address: '502 10th Ave, New York, NY 10018',
    hours: 'Open 24/7',
    distance: '0.8 mi',
    services: ['ER', 'Genomics Lab', 'Surgery'],
    markerLabel: 'NY',
    markerStyle: 'default',
    lat: 40.7544,
    lng: -73.9977,
  },
  {
    id: 'chelsea',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura West — Chelsea',
    address: '128 W 18th St, New York, NY 10011',
    hours: '8 AM – 8 PM',
    distance: '1.2 mi',
    services: ['Imaging', 'Mental Health'],
    markerLabel: 'NY',
    markerStyle: 'beam',
    lat: 40.7398,
    lng: -73.9968,
  },
  {
    id: 'ues',
    tag: 'Clinic',
    tagStyle: 'default',
    name: 'Aura Upper East Side',
    address: '1100 Park Ave, New York, NY 10128',
    hours: '9 AM – 6 PM',
    distance: '4.5 mi',
    services: ['Primary Care', 'Dermatology'],
    markerLabel: 'NY',
    markerStyle: 'default',
    lat: 40.7894,
    lng: -73.9530,
  },
  // ── New York — Brooklyn ───────────────────────────────────────
  {
    id: 'brooklyn',
    tag: 'Specialized Lab',
    tagStyle: 'sage',
    name: 'Aura Brooklyn Heights',
    address: '15 Montague St, Brooklyn, NY 11201',
    hours: '8 AM – 5 PM',
    distance: '6.1 mi',
    services: ['Cardiology', 'Blood Work'],
    markerLabel: 'BK',
    markerStyle: 'default',
    lat: 40.6935,
    lng: -73.9932,
  },
  {
    id: 'brooklyn-wburg',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura Williamsburg',
    address: '325 Kent Ave, Brooklyn, NY 11249',
    hours: '7 AM – 9 PM',
    distance: '5.4 mi',
    services: ['Physical Therapy', 'Nutrition', 'Mental Health'],
    markerLabel: 'BK',
    markerStyle: 'beam',
    lat: 40.7134,
    lng: -73.9618,
  },
  // ── Washington DC ─────────────────────────────────────────────
  {
    id: 'dc-flagship',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Capitol — Foggy Bottom',
    address: '2141 K St NW, Washington, DC 20037',
    hours: 'Open 24/7',
    services: ['ER', 'Oncology', 'Neurosurgery'],
    markerLabel: 'DC',
    markerStyle: 'default',
    lat: 38.9025,
    lng: -77.0485,
  },
  {
    id: 'dc-clinic',
    tag: 'Clinic',
    tagStyle: 'default',
    name: 'Aura Georgetown',
    address: '3301 New Mexico Ave NW, Washington, DC 20016',
    hours: '8 AM – 6 PM',
    services: ['Primary Care', 'Pediatrics', 'Women\'s Health'],
    markerLabel: 'DC',
    markerStyle: 'default',
    lat: 38.9280,
    lng: -77.0735,
  },
  // ── Miami ─────────────────────────────────────────────────────
  {
    id: 'miami-brickell',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura Brickell',
    address: '1450 Brickell Ave, Miami, FL 33131',
    hours: '7 AM – 9 PM',
    services: ['Imaging', 'Sports Medicine', 'Dermatology'],
    markerLabel: 'MI',
    markerStyle: 'beam',
    lat: 25.7585,
    lng: -80.1918,
  },
  {
    id: 'miami-health',
    tag: 'Specialized Lab',
    tagStyle: 'sage',
    name: 'Aura Miami Health District',
    address: '1150 NW 14th St, Miami, FL 33136',
    hours: '8 AM – 5 PM',
    services: ['Genomics Lab', 'Pathology', 'Blood Work'],
    markerLabel: 'MI',
    markerStyle: 'default',
    lat: 25.7895,
    lng: -80.2100,
  },
  // ── Houston ───────────────────────────────────────────────────
  {
    id: 'houston-tmc',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Texas Medical Center',
    address: '6560 Fannin St, Houston, TX 77030',
    hours: 'Open 24/7',
    services: ['ER', 'Cardiology', 'Transplant Center'],
    markerLabel: 'HO',
    markerStyle: 'default',
    lat: 29.7105,
    lng: -95.3965,
  },
  {
    id: 'houston-kirby',
    tag: 'Clinic',
    tagStyle: 'default',
    name: 'Aura Upper Kirby',
    address: '2727 Kirby Dr, Houston, TX 77098',
    hours: '9 AM – 6 PM',
    services: ['Primary Care', 'Endocrinology', 'Allergy'],
    markerLabel: 'HO',
    markerStyle: 'default',
    lat: 29.7380,
    lng: -95.4215,
  },
  // ── Chicago ───────────────────────────────────────────────────
  {
    id: 'chicago-streeterville',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Streeterville',
    address: '259 E Erie St, Chicago, IL 60611',
    hours: 'Open 24/7',
    services: ['ER', 'Neurology', 'Orthopedics'],
    markerLabel: 'CH',
    markerStyle: 'default',
    lat: 41.8940,
    lng: -87.6210,
  },
  {
    id: 'chicago-imd',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura Illinois Medical District',
    address: '1725 W Harrison St, Chicago, IL 60612',
    hours: '7 AM – 8 PM',
    services: ['Physical Therapy', 'Mental Health', 'Nutrition'],
    markerLabel: 'CH',
    markerStyle: 'beam',
    lat: 41.8745,
    lng: -87.6695,
  },
  // ── Los Angeles ───────────────────────────────────────────────
  {
    id: 'la-beverly',
    tag: 'Flagship Hospital',
    tagStyle: 'default',
    name: 'Aura Beverly',
    address: '8700 Beverly Blvd, Los Angeles, CA 90048',
    hours: 'Open 24/7',
    services: ['ER', 'Oncology', 'Robotic Surgery'],
    markerLabel: 'LA',
    markerStyle: 'default',
    lat: 34.0762,
    lng: -118.3810,
  },
  {
    id: 'la-brentwood',
    tag: 'Specialized Lab',
    tagStyle: 'sage',
    name: 'Aura Brentwood',
    address: '200 S Barrington Ave, Los Angeles, CA 90049',
    hours: '8 AM – 5 PM',
    services: ['Genomics Lab', 'Blood Work', 'Radiology'],
    markerLabel: 'LA',
    markerStyle: 'default',
    lat: 34.0535,
    lng: -118.4645,
  },
  // ── San Francisco ─────────────────────────────────────────────
  {
    id: 'sf-parnassus',
    tag: 'Wellness Center',
    tagStyle: 'beam',
    name: 'Aura Parnassus',
    address: '400 Parnassus Ave, San Francisco, CA 94143',
    hours: '7 AM – 9 PM',
    services: ['Imaging', 'Mental Health', 'Integrative Medicine'],
    markerLabel: 'SF',
    markerStyle: 'beam',
    lat: 37.7631,
    lng: -122.4576,
  },
  {
    id: 'sf-pac-heights',
    tag: 'Clinic',
    tagStyle: 'default',
    name: 'Aura Pacific Heights',
    address: '2100 Webster St, San Francisco, CA 94115',
    hours: '9 AM – 6 PM',
    services: ['Primary Care', 'Ophthalmology', 'Dermatology'],
    markerLabel: 'SF',
    markerStyle: 'default',
    lat: 37.7885,
    lng: -122.4325,
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
          <NoraLogo className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline" />
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
        <main
          id="main-content"
          className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10 h-auto lg:h-[700px] mb-20"
        >
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
                          ? 'var(--organic-sage)'
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
                  {loc.hours}
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
            className="rounded-[var(--radius-card)] overflow-hidden relative border border-[var(--glass-border)] min-h-[400px] lg:min-h-0 order-first lg:order-none"
            aria-label="Map"
          >
            <LocationsMap
              locations={locations}
              activeId={activeId}
              onSelectLocation={setActiveId}
            />
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
