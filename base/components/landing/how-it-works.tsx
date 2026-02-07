'use client';

import React, { useEffect, useRef, useState } from 'react';
import GlassCard from '@/components/ui/glass-card';

const steps = [
  {
    number: '01',
    title: 'Describe your symptoms',
    description: 'Share your health concerns in natural language. Our conversational AI understands context and nuance.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <circle cx="20" cy="20" r="18" fill="url(#iconGradientRose)" fillOpacity="0.15" />
        <circle cx="20" cy="20" r="12" fill="url(#iconGradientRose)" fillOpacity="0.3" />
        <circle cx="20" cy="20" r="6" fill="url(#iconGradientRose)" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'AI analyzes patterns',
    description: 'Advanced algorithms cross-reference symptoms with medical knowledge to identify relevant specialties.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <rect x="8" y="8" width="24" height="24" rx="6" fill="url(#iconGradientSage)" fillOpacity="0.15" />
        <rect x="12" y="12" width="16" height="16" rx="4" fill="url(#iconGradientSage)" fillOpacity="0.3" />
        <rect x="16" y="16" width="8" height="8" rx="2" fill="url(#iconGradientSage)" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Get matched instantly',
    description: 'Receive personalized provider recommendations ranked by expertise, availability, and proximity.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <path d="M20 4 L36 20 L20 36 L4 20 Z" fill="url(#iconGradientRose)" fillOpacity="0.15" />
        <path d="M20 10 L30 20 L20 30 L10 20 Z" fill="url(#iconGradientRose)" fillOpacity="0.3" />
        <path d="M20 15 L25 20 L20 25 L15 20 Z" fill="url(#iconGradientRose)" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Book in seconds',
    description: 'Select your preferred time slot and confirm. Real-time calendar sync ensures instant booking.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <circle cx="20" cy="12" r="8" fill="url(#iconGradientSage)" fillOpacity="0.15" />
        <circle cx="12" cy="28" r="8" fill="url(#iconGradientSage)" fillOpacity="0.3" />
        <circle cx="28" cy="28" r="8" fill="url(#iconGradientSage)" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-warm-100/30 to-white pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-organic-sage bg-organic-sage/10 rounded-full mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-warm-900 tracking-tight-organic">
            A thoughtful process,
            <br />
            <span className="text-warm-500">designed for you</span>
          </h2>
        </div>

        {/* SVG Definitions */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="iconGradientRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.85 0.08 15)" />
              <stop offset="100%" stopColor="oklch(0.92 0.06 60)" />
            </linearGradient>
            <linearGradient id="iconGradientSage" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.82 0.06 155)" />
              <stop offset="100%" stopColor="oklch(0.92 0.04 165)" />
            </linearGradient>
            <linearGradient id="lineGradientFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.85 0.08 15)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="oklch(0.82 0.06 155)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="oklch(0.92 0.04 165)" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Timeline with flowing line - Desktop */}
        <div className="hidden lg:block relative mb-16">
          {/* Flowing connector line */}
          <svg 
            className="absolute top-20 left-0 w-full h-20 pointer-events-none"
            viewBox="0 0 1000 80"
            preserveAspectRatio="none"
          >
            <path
              d="M 60 40 Q 180 20 300 40 T 540 40 T 780 40 Q 870 50 940 40"
              fill="none"
              stroke="url(#lineGradientFlow)"
              strokeWidth="3"
              strokeLinecap="round"
              className={`transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                strokeDasharray: 1200,
                strokeDashoffset: isVisible ? 0 : 1200,
                transition: 'stroke-dashoffset 2s ease-out, opacity 0.5s ease',
              }}
            />
          </svg>

          {/* Steps grid */}
          <div className="grid lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 150 + 300}ms` }}
              >
                <GlassCard 
                  variant="solid" 
                  padding="lg" 
                  rounded="2xl"
                  className="h-full"
                >
                  {/* Icon with organic shape */}
                  <div className="mb-6">
                    <div className="relative inline-block">
                      {step.icon}
                      {/* Subtle glow */}
                      <div className="absolute inset-0 blur-xl opacity-30">
                        {step.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Step number */}
                  <div className="text-sm font-semibold text-organic-sage mb-2">
                    Step {step.number}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold text-warm-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-warm-500 leading-relaxed text-sm">
                    {step.description}
                  </p>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline - Mobile/Tablet */}
        <div className="lg:hidden space-y-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex gap-4 transition-all duration-700 ${
                isVisible 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-4'
              }`}
              style={{ transitionDelay: `${index * 100 + 200}ms` }}
            >
              {/* Vertical line connector */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-organic-sage/20 to-organic-mint/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-organic-sage">{step.number}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 flex-1 my-2 bg-gradient-to-b from-organic-sage/40 to-organic-mint/20" />
                )}
              </div>
              
              {/* Content */}
              <GlassCard variant="solid" padding="md" rounded="xl" className="flex-1 mb-2">
                <h3 className="text-lg font-semibold text-warm-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-warm-500 leading-relaxed text-sm">
                  {step.description}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>

        {/* Bottom stat or CTA */}
        <div 
          className={`text-center mt-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          <p className="text-warm-500 text-lg">
            Average time from symptoms to booked appointment:{' '}
            <span className="font-semibold text-warm-900">under 2 minutes</span>
          </p>
        </div>
      </div>
    </section>
  );
}
