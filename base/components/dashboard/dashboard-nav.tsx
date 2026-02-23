'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { NoraLogo } from '@/components/navigation/nora-logo';

export function DashboardNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `transition-transform duration-200 inline-block hover:scale-105 origin-left ${isActive ? 'font-bold opacity-100' : 'font-normal opacity-50 hover:opacity-100 hover:font-semibold'}`;
  };

  const NAV_LINKS = [
    { href: '/dashboard/get-care', label: 'Get Care' },
    { href: '/dashboard/providers', label: 'Providers' },
    { href: '/dashboard/appointments', label: 'Appointments' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];

  return (
    <nav className="py-6 mb-6" aria-label="Dashboard navigation">
      <div className="flex justify-between items-center">
        <NoraLogo
          href="/dashboard"
          className="font-serif text-2xl italic flex items-center gap-3 text-foreground no-underline"
        />

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 text-[0.9rem]">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={navLinkClass(href)}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => logout()}
            className="hidden md:block text-[0.85rem] font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            Log out
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-black/5 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="dashboard-mobile-menu"
          className="md:hidden mt-4 border border-[var(--glass-border)] rounded-2xl bg-white/80 backdrop-blur-md p-4 space-y-2"
          role="menu"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className={`block px-4 py-2.5 rounded-xl text-[0.9rem] transition-colors ${
                pathname === href || pathname.startsWith(`${href}/`)
                  ? 'font-semibold bg-black/5'
                  : 'opacity-70 hover:opacity-100 hover:bg-black/5'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-[var(--glass-border)] pt-2 mt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="block w-full text-left px-4 py-2.5 rounded-xl text-[0.9rem] opacity-70 hover:opacity-100 hover:bg-black/5 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
