'use client';

import React from 'react';
import Link from 'next/link';
import GradientOrb from '@/components/ui/gradient-orb';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-mesh">
      {/* Animated gradient orbs */}
      <GradientOrb 
        size="xl" 
        variant="rose" 
        className="top-10 -left-20 opacity-40" 
        animation="float-slow"
      />
      <GradientOrb 
        size="lg" 
        variant="sage" 
        className="top-40 right-10 opacity-30" 
        animation="float"
      />
      <GradientOrb 
        size="md" 
        variant="mint" 
        className="bottom-32 left-1/4 opacity-35" 
        animation="float-reverse"
      />
      <GradientOrb 
        size="lg" 
        variant="peach" 
        className="bottom-20 right-1/4 opacity-30" 
        animation="float-slow"
      />
      
      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 py-20 text-center">
        {/* Badge */}
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-8 shadow-organic-sm animate-fade-in"
        >
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-organic-sage to-organic-mint animate-pulse" />
          <span className="text-sm font-medium text-warm-700">AI-Powered Healthcare</span>
        </div>

        {/* Main headline */}
        <h1 
          className="text-5xl md:text-6xl lg:text-7xl font-semibold text-warm-900 tracking-tight-organic leading-[1.1] mb-6 animate-fade-in-up"
        >
          Your health journey,
          <br />
          <span className="text-gradient-organic">simplified.</span>
        </h1>

        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl text-warm-500 max-w-2xl mx-auto mb-10 leading-relaxed-plus animate-fade-in-up delay-200"
          style={{ opacity: 0, animationFillMode: 'forwards' }}
        >
          From describing symptoms to booking with the right specialist—all in under 2 minutes. 
          Let AI guide you to the care you need.
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-300"
          style={{ opacity: 0, animationFillMode: 'forwards' }}
        >
          <Link
            href="/quick-booking"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-warm-900 text-white font-medium rounded-2xl shadow-organic hover:shadow-organic-lg transition-organic hover:-translate-y-1"
          >
            Get Started
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
            Learn how it works
          </Link>
        </div>

        {/* Abstract visualization - Connected dots forming a wave */}
        <div 
          className="relative w-full max-w-3xl mx-auto h-40 animate-fade-in-up delay-500"
          style={{ opacity: 0, animationFillMode: 'forwards' }}
        >
          <svg 
            viewBox="0 0 800 120" 
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.85 0.08 15)" stopOpacity="0.2" />
                <stop offset="30%" stopColor="oklch(0.82 0.06 155)" stopOpacity="0.6" />
                <stop offset="70%" stopColor="oklch(0.82 0.06 155)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="oklch(0.92 0.04 165)" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="dotGradientRose" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(0.85 0.08 15)" />
                <stop offset="100%" stopColor="oklch(0.92 0.06 60)" />
              </linearGradient>
              <linearGradient id="dotGradientSage" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(0.82 0.06 155)" />
                <stop offset="100%" stopColor="oklch(0.92 0.04 165)" />
              </linearGradient>
            </defs>
            
            {/* Flowing connection line */}
            <path
              d="M 50 60 Q 150 30 250 55 T 450 50 T 650 55 Q 700 65 750 60"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-draw-line"
            />
            
            {/* Connection dots with staggered animations */}
            {[
              { cx: 50, cy: 60, r: 8, gradient: 'dotGradientRose', delay: '0.1s' },
              { cx: 150, cy: 38, r: 6, gradient: 'dotGradientSage', delay: '0.2s' },
              { cx: 250, cy: 55, r: 10, gradient: 'dotGradientRose', delay: '0.3s' },
              { cx: 350, cy: 45, r: 7, gradient: 'dotGradientSage', delay: '0.4s' },
              { cx: 450, cy: 50, r: 12, gradient: 'dotGradientRose', delay: '0.5s' },
              { cx: 550, cy: 48, r: 6, gradient: 'dotGradientSage', delay: '0.6s' },
              { cx: 650, cy: 55, r: 9, gradient: 'dotGradientRose', delay: '0.7s' },
              { cx: 750, cy: 60, r: 7, gradient: 'dotGradientSage', delay: '0.8s' },
            ].map((dot, index) => (
              <g key={index}>
                <circle
                  cx={dot.cx}
                  cy={dot.cy}
                  r={dot.r + 4}
                  fill={`url(#${dot.gradient})`}
                  opacity="0.2"
                  className="animate-pulse-soft"
                  style={{ animationDelay: dot.delay }}
                />
                <circle
                  cx={dot.cx}
                  cy={dot.cy}
                  r={dot.r}
                  fill={`url(#${dot.gradient})`}
                  className="animate-scale-in"
                  style={{ animationDelay: dot.delay, opacity: 0, animationFillMode: 'forwards' }}
                />
              </g>
            ))}
            
            {/* Labels */}
            <text x="50" y="90" textAnchor="middle" className="fill-warm-500 text-[10px] font-medium">
              Symptoms
            </text>
            <text x="250" y="90" textAnchor="middle" className="fill-warm-500 text-[10px] font-medium">
              AI Analysis
            </text>
            <text x="450" y="90" textAnchor="middle" className="fill-warm-500 text-[10px] font-medium">
              Matching
            </text>
            <text x="650" y="90" textAnchor="middle" className="fill-warm-500 text-[10px] font-medium">
              Booking
            </text>
          </svg>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
};

export default Hero;
