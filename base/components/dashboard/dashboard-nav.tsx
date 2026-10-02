'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Today' },
  { href: '/dashboard/prior-authorizations', label: 'Prior auths' },
  { href: '/dashboard/patients', label: 'Patients' },
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const initials = [user?.first_name, user?.last_name].map((n) => n?.[0]).filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase();

  return (
    <nav aria-label="Dashboard navigation" className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <NoraLogo href="/dashboard" />

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors',
                isActive(href) ? 'bg-tile-strong text-ink' : 'text-body hover:bg-tile-strong hover:text-ink'
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {initials && (
            <span
              title={user?.email}
              className="hidden size-8 items-center justify-center rounded-full bg-blue-tint text-xs font-semibold text-blue-deep sm:flex"
              aria-hidden
            >
              {initials}
            </span>
          )}
          <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={() => logout()}>
            Log out
          </Button>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-tile-strong text-ink md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="dashboard-mobile-menu" className="border-t border-border bg-white px-5 py-3 md:hidden">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'block rounded-2xl px-4 py-3 text-[1.0625rem] font-medium',
                isActive(href) ? 'bg-tile-strong text-ink' : 'text-body'
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { logout(); setMobileMenuOpen(false); }}
            className="mt-1 block w-full rounded-2xl px-4 py-3 text-left text-[1.0625rem] font-medium text-body"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
