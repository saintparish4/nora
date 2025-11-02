'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/header';
import Hero from '@/components/hero';
import AiMatching from '@/components/aiMatching';
import Comparison from '@/components/comparsion';
import HowItWorks from '@/components/how-it-works';
import Providers from '@/components/providers';
import Testimonials from '@/components/testimonials';
import CtaBanner from '@/components/cta-banner';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <Header />
      <Hero />
      <AiMatching />
      <Comparison />
      <HowItWorks />
      <Providers />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </div>
  );
}