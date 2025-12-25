'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GradientOrb from '@/components/ui/gradient-orb';

export default function CtaBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-organic-rose/20 via-organic-peach/30 to-organic-sage/20 animate-gradient" />
      
      {/* Floating orbs */}
      <GradientOrb 
        size="lg" 
        variant="rose" 
        className="top-0 -left-20 opacity-30" 
        animation="float-slow"
      />
      <GradientOrb 
        size="md" 
        variant="sage" 
        className="bottom-0 right-10 opacity-25" 
        animation="float"
      />
      <GradientOrb 
        size="sm" 
        variant="mint" 
        className="top-1/2 right-1/4 opacity-20" 
        animation="float-reverse"
      />
      
      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        {/* Content */}
        <div 
          className={`transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-warm-900 tracking-tight-organic mb-6">
            Ready to simplify
            <br />
            your healthcare journey?
          </h2>
          
          <p className="text-lg text-warm-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join thousands who have discovered a better way to connect with the right care. 
            From symptoms to specialist in under 2 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-warm-900 text-white font-medium rounded-2xl shadow-organic hover:shadow-organic-lg transition-organic hover:-translate-y-1"
            >
              Start Your Journey
              <svg 
                className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 text-warm-700 font-medium rounded-2xl hover:bg-white/50 transition-organic"
            >
              See how it works
            </Link>
          </div>
        </div>
        
        {/* Trust indicators */}
        <div 
          className={`mt-16 flex flex-wrap items-center justify-center gap-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {[
            { value: '50K+', label: 'Appointments booked' },
            { value: '2min', label: 'Average booking time' },
            { value: '98%', label: 'User satisfaction' },
          ].map((stat, index) => (
            <div key={index} className="text-center px-6">
              <div className="text-2xl font-semibold text-warm-900">{stat.value}</div>
              <div className="text-sm text-warm-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
