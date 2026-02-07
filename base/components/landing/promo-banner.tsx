'use client';

import React from 'react';
import Link from 'next/link';

export default function PromoBanner() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image/Mockup */}
          <div className="relative">
            <div className="bg-gray-100 rounded-2xl aspect-[4/3] overflow-hidden">
              {/* Product mockup placeholder */}
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                  {/* Mock interface */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">N</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Health Dashboard</div>
                      <div className="text-xs text-gray-500">Real-time insights</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-teal/20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal/10 text-teal-dark rounded-full mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Limited Time Offer</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-light text-gray-900 mb-3">
              Exclusive offer: <span className="font-medium">Save $75</span>
            </h3>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Get started with your first health assessment at a special introductory rate. 
              Experience AI-powered healthcare matching with our premium consultation package.
            </p>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white font-medium rounded-lg hover:bg-black transition-colors"
            >
              Claim Offer
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
