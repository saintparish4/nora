'use client';

import React from 'react';

const features = [
  { name: 'Symptom Analysis', traditional: false, nora: true },
  { name: 'AI-Powered Matching', traditional: false, nora: true },
  { name: 'Real-time Availability', traditional: false, nora: true },
  { name: 'Instant Booking', traditional: false, nora: true },
  { name: 'Insurance Filtering', traditional: false, nora: true },
  { name: 'Provider Reviews', traditional: true, nora: true },
  { name: '24/7 Access', traditional: false, nora: true },
  { name: 'Appointment Reminders', traditional: true, nora: true },
];

function CheckIcon({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Comparison() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900">
            See how <span className="font-medium">Nora compares</span>
          </h2>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
            <div className="px-6 py-4">
              <span className="text-sm font-medium text-gray-500">Feature</span>
            </div>
            <div className="px-6 py-4 text-center border-l border-gray-200">
              <span className="text-sm font-medium text-gray-500">Traditional</span>
            </div>
            <div className="px-6 py-4 text-center border-l border-gray-200 bg-teal/5">
              <span className="text-sm font-medium text-teal-dark">Nora</span>
            </div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-gray-100">
            {features.map((feature, index) => (
              <div key={index} className="grid grid-cols-3">
                <div className="px-6 py-4">
                  <span className="text-sm text-gray-900">{feature.name}</span>
                </div>
                <div className="px-6 py-4 flex justify-center items-center border-l border-gray-100">
                  <CheckIcon checked={feature.traditional} />
                </div>
                <div className="px-6 py-4 flex justify-center items-center border-l border-gray-100 bg-teal/5">
                  <CheckIcon checked={feature.nora} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
