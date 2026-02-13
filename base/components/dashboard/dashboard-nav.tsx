'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { NoraLogo } from '@/components/navigation/nora-logo';

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const displayName = user?.email?.split('@')[0] || 'Elena Berg';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return `transition-transform duration-200 inline-block hover:scale-105 origin-left ${isActive ? 'font-bold opacity-100' : 'font-normal opacity-50 hover:opacity-100 hover:font-semibold'}`;
  };

  return (
    <nav className="flex justify-between items-center py-6 mb-6">
      <NoraLogo href="/dashboard" className="font-serif text-2xl italic flex items-center gap-3 text-foreground no-underline" />

      <div className="flex gap-8 text-[0.9rem]">
        <Link href="/dashboard/labs" className={navLinkClass('/dashboard/labs')}>
          Health Records
        </Link>
        <Link href="/dashboard/messages" className={navLinkClass('/dashboard/messages')}>
          Care Team
        </Link>
        <Link href="/dashboard/settings" className={navLinkClass('/dashboard/settings')}>
          Settings
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-white/40 py-1.5 pl-1.5 pr-4 rounded-full border border-[var(--glass-border)]">
          <div className="w-8 h-8 rounded-full bg-[var(--beam-start)] flex items-center justify-center font-semibold text-[0.8rem]">
            {initials}
          </div>
          <span className="text-[0.85rem] font-medium">{displayName}</span>
        </div>
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
