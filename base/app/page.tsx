'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/header';
import Hero from '@/components/hero';
import Credentials from '@/components/credentials';
import PromoBanner from '@/components/promo-banner';
import AiMatching from '@/components/aiMatching';
import HowItWorks from '@/components/how-it-works';
import Comparison from '@/components/comparsion';
import AppShowcase from '@/components/app-showcase';
import Testimonials from '@/components/testimonials';
import FAQ from '@/components/faq';
import CtaBanner from '@/components/cta-banner';
import Newsletter from '@/components/newsletter';
import Footer from '@/components/footer';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header variant="light" />
      <main>
        <Hero />
        <Credentials />
        <PromoBanner />
        <AiMatching />
        <HowItWorks />
        <Comparison />
        <AppShowcase />
        <Testimonials />
        <FAQ />
        <CtaBanner />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
