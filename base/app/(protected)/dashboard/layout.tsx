'use client';

import { AuthProtected } from '@/components/dashboard/auth-protected';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProtected>
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
        {/* Noise overlay */}
        <div className="noise-overlay" />

        {/* Beam background gradient */}
        <div
          className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] -z-10"
          style={{
            background:
              'radial-gradient(circle, rgba(224,242,194,0.4) 0%, rgba(239,238,236,0) 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="max-w-[1400px] mx-auto px-10 relative z-10">
          <DashboardNav />
          {children}
        </div>
      </div>
    </AuthProtected>
  );
}
