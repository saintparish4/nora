'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { NoraLogo } from '@/components/navigation/nora-logo';

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();


  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `transition-transform duration-200 inline-block hover:scale-105 origin-left ${isActive ? 'font-bold opacity-100' : 'font-normal opacity-50 hover:opacity-100 hover:font-semibold'}`;
  };

  return (
    <nav className="flex justify-between items-center py-6 mb-6">
      <NoraLogo href="/dashboard" className="font-serif text-2xl italic flex items-center gap-3 text-foreground no-underline" />

      <div className="flex gap-8 text-[0.9rem]">
        <Link href="/dashboard/providers" className={navLinkClass('/dashboard/providers')}>
          Providers
        </Link>
        <Link href="/dashboard/appointments" className={navLinkClass('/dashboard/appointments')}>
          Appointments
        </Link>
        <Link href="/dashboard/settings" className={navLinkClass('/dashboard/settings')}>
          Settings
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => logout()}
          className="text-[0.85rem] font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
