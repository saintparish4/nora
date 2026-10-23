'use client';

import { AuthProtected } from '@/components/dashboard/auth-protected';
import { AccountCache } from '@/components/dashboard/account-cache';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { DemoTour } from '@/components/demo/demo-tour';
import { SiteFooter } from '@/components/navigation/site-footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProtected>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <DemoBanner />
        <DashboardNav />
        {/* At least a screen tall, so a short loading skeleton never pulls the
            footer into view only for the content to push it out again. */}
        <main id="main-content" className="mx-auto min-h-screen w-full max-w-[1200px] flex-1 px-5 pt-8 sm:px-8 sm:pt-10">
          <AccountCache>{children}</AccountCache>
        </main>
        <SiteFooter />
        <DemoTour />
      </div>
    </AuthProtected>
  );
}
