'use client';

import React from 'react';

const leaders = [
  {
    name: 'Dr. Sarah Chen',
    title: 'Chief Medical Officer',
    credentials: 'MD, PhD Stanford Medicine',
    initials: 'SC',
    description: 'Former Director of Digital Health at Stanford. 15+ years in clinical practice and health tech innovation.'
  },
  {
    name: 'Dr. Michael Torres',
    title: 'Head of AI Research',
    credentials: 'PhD MIT AI Lab',
    initials: 'MT',
    description: 'Led machine learning teams at Google Health. Pioneer in medical AI diagnostics and NLP.'
  },
  {
    name: 'Dr. Emily Watson',
    title: 'Clinical Director',
    credentials: 'MD Johns Hopkins',
    initials: 'EW',
    description: 'Board-certified internist with expertise in preventive medicine and patient-centered care.'
  },
];

export default function Credentials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900 leading-tight">
            Built by world-class leaders in <span className="font-medium">longevity</span>
          </h2>
          <h2 className="text-2xl md:text-3xl font-light text-gray-900">
            <span className="font-medium">science and medicine</span>
          </h2>
        </div>

        {/* Leader Cards - horizontal layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {leaders.map((leader, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border border-gray-200"
            >
              {/* Profile header */}
              <div className="flex items-start gap-4 mb-4">
                {/* Avatar placeholder */}
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium text-sm">
                    {leader.initials}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{leader.name}</h3>
                  <p className="text-sm text-teal-dark">{leader.title}</p>
                  <p className="text-xs text-gray-500">{leader.credentials}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {leader.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
