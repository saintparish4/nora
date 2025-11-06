'use client';

import React from 'react';
import Link from 'next/link';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-50/20 rounded-full blur-3xl" />
      </div>

      <div className="relative container-refined">
        <div className="text-center max-w-4xl mx-auto">
          {/* Trust indicator */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200/50 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-600">
                Trusted by 50,000+ patients worldwide
              </span>
            </div>
          </div>

          {/* Main headline */}
          <h1
            className="text-6xl md:text-7xl lg:text-8xl font-light text-gray-900 leading-[0.9] tracking-tight mb-8"
          >
            Healthcare that{' '}
            <span className="font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              fits
            </span>
            <br />
            perfectly
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-16 font-light leading-relaxed"
          >
            AI-powered symptom analysis connects you with the right specialist instantly. 
            Real-time availability. Seamless booking.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link
              href="/quick-booking"
              className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-3">
                ⚡ Book in Under 2 Minutes
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            
            <Link
              href="/providers"
              className="px-10 py-4 bg-white text-gray-900 font-medium rounded-full border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Browse Providers
            </Link>
          </div>

          {/* Feature callout */}
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Go from symptoms to booked appointment in under 2 minutes
            </div>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-12 max-w-lg mx-auto"
          >
            {[
              { value: '50K+', label: 'Patients Served' },
              { value: '98%', label: 'Satisfaction Rate' },
              { value: '<2min', label: 'Average Match Time' },
            ].map((stat, index) => (
              <div 
                key={index} 
                className="text-center"
              >
                <div className="text-3xl font-semibold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      
    </section>
  );
};

export default Hero;
