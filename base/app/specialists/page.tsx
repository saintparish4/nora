import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Specialists | Aura Health AI',
  description:
    "Browse our network of precision specialists verified by Aura's diagnostic accuracy standards.",
};

type SpecialistTag = { label: string; availability?: boolean };

const specialists: Array<{
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  image: string;
  tags: SpecialistTag[];
  bio: string;
  hasBeam: boolean;
}> = [
  {
    id: 1,
    name: 'Dr. Sarah Chen',
    specialty: 'Senior Cardiologist • PhD',
    rating: 4.9,
    reviewCount: 128,
    image:
      'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200',
    tags: [
      { label: '14 Years Exp.' },
      { label: 'Johns Hopkins Alum' },
      { label: 'Available Tomorrow', availability: true },
    ],
    bio: 'Specializes in AI-assisted robotic surgery and preventative cardiovascular health modeling.',
    hasBeam: true,
  },
  {
    id: 2,
    name: 'Dr. Marcus Thorne',
    specialty: 'Interventional Cardiology',
    rating: 4.8,
    reviewCount: 94,
    image:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    tags: [
      { label: '10 Years Exp.' },
      { label: 'Stanford Medical' },
      { label: 'Available Today', availability: true },
    ],
    bio: 'Expert in genomic mapping for early detection of hereditary heart conditions.',
    hasBeam: true,
  },
  {
    id: 3,
    name: 'Dr. Elena Rodriguez',
    specialty: 'Pediatric Cardiologist',
    rating: 5.0,
    reviewCount: 210,
    image:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200',
    tags: [
      { label: '18 Years Exp.' },
      { label: 'Mayo Clinic' },
      { label: 'Telehealth Only' },
    ],
    bio: 'Leading researcher in congenital heart defects and non-invasive diagnostic imaging.',
    hasBeam: false,
  },
  {
    id: 4,
    name: 'Dr. Julian Vane',
    specialty: 'Electrophysiology',
    rating: 4.7,
    reviewCount: 56,
    image:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    tags: [
      { label: '8 Years Exp.' },
      { label: 'Oxford Medical' },
      { label: 'In-Person Only', availability: true },
    ],
    bio: 'Specializing in cardiac rhythm disorders and advanced pacemaker integration.',
    hasBeam: false,
  },
];

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
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function SpecialistsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative">
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
              className="nav-item-underline text-[0.9rem] relative opacity-100 after:!w-full"
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
          <Link
            href="/login"
            className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Patient Login
          </Link>
        </nav>

        {/* Page header */}
        <header className="pt-[60px] pb-10 text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[20px] bg-[rgba(255,156,107,0.1)] text-[#C27045] text-xs font-semibold mb-6 border border-[rgba(255,156,107,0.2)]">
            <div className="w-2 h-2 rounded-full bg-[var(--beam-start)] animate-aura-pulse" />
            MATCHING SYSTEM ACTIVE
          </div>
          <h1 className="font-serif text-4xl md:text-[3.5rem] mb-4 tracking-[-0.02em] font-normal">
            Find your care team.
          </h1>
          <p className="text-[1.1rem] opacity-60 max-w-[500px]">
            Browse our network of precision specialists verified by Aura&apos;s
            diagnostic accuracy standards.
          </p>
        </header>

        {/* Browse layout: sidebar + grid */}
        <main className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 pb-[100px]">
          {/* Filters sidebar - hidden on smaller screens */}
          <aside className="hidden lg:block sticky top-8 h-fit">
            <div className="border-b border-[var(--glass-border)] pb-6 mb-8">
              <h4 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Specialty
              </h4>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-[var(--ink-color)]"
                />
                Cardiology
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Neurology
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Oncology
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Endocrinology
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                Pediatrics
              </label>
            </div>
            <div className="border-b border-[var(--glass-border)] pb-6 mb-8">
              <h4 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Experience
              </h4>
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
              <h4 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Availability
              </h4>
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
              <h4 className="text-[0.75rem] uppercase tracking-[0.1em] mb-4 opacity-60">
                Rating
              </h4>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                4.8 & above
              </label>
              <label className="flex items-center gap-3 mb-3 cursor-pointer text-[0.9rem]">
                <input type="checkbox" className="w-4 h-4 accent-[var(--ink-color)]" />
                4.5 & above
              </label>
            </div>
          </aside>

          {/* Specialist cards grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specialists.map((s) => (
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
                  />
                )}
                <div className="flex gap-5 mb-6">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-20 h-20 rounded-full object-cover border border-[var(--glass-border)] bg-gradient-to-br from-[#ddd] to-[#eee]"
                  />
                  <div>
                    <h3 className="font-serif text-2xl mb-1 font-normal">
                      {s.name}
                    </h3>
                    <span className="text-[0.9rem] opacity-60 block mb-2">
                      {s.specialty}
                    </span>
                    <div className="flex items-center gap-1 text-[0.85rem] font-medium">
                      ✦ {s.rating}{' '}
                      <span className="opacity-40 font-normal">
                        ({s.reviewCount} reviews)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-6">
                  {s.tags.map((tag, i) => (
                    <span
                      key={i}
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
                <p className="text-[0.9rem] leading-[1.5] opacity-70 mb-6">
                  {s.bio}
                </p>
                <div className="flex justify-between items-center pt-6 border-t border-[var(--glass-border)]">
                  <Link
                    href="#"
                    className="text-[var(--ink-color)] text-[0.9rem] font-medium no-underline flex items-center gap-2 hover:[&>svg]:translate-x-1 [&>svg]:transition-transform [&>svg]:duration-300"
                  >
                    View Profile <ArrowRightIcon />
                  </Link>
                  <button
                    type="button"
                    className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] bg-transparent cursor-pointer transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
                  >
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
