'use client';

import React from 'react';

export default function AIMatching() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900">
            Optimal real-time <span className="font-medium">health insights</span>
          </h2>
        </div>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Our AI-powered system analyzes your symptoms in real-time, providing instant recommendations 
          for the most qualified healthcare specialists.
        </p>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left - Feature description */}
          <div className="space-y-8">
            {[
              {
                title: 'AI-powered symptom analysis',
                description: 'Advanced natural language processing understands your health concerns and identifies potential conditions with high accuracy.',
              },
              {
                title: 'Intelligent specialist matching',
                description: 'Our algorithm matches you with providers based on expertise, availability, insurance acceptance, and patient reviews.',
              },
              {
                title: 'Real-time scheduling',
                description: 'See live availability across multiple providers and book your appointment instantly—no phone calls required.',
              }
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-teal" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Chat mockup */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            {/* Chat header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
                <span className="text-white font-semibold text-sm">N</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Nora AI</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#1a1a1a] text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                  <p className="text-sm">I&apos;ve been having persistent headaches for the past week</p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-700 mb-3">
                    I found <span className="font-medium text-teal-dark">3 neurologists</span> near you with availability this week:
                  </p>
                  
                  {/* Provider cards */}
                  <div className="space-y-2">
                    {[
                      { name: 'Dr. Sarah Chen', specialty: 'Headache Specialist', time: 'Today, 2:00 PM', rating: '4.9' },
                      { name: 'Dr. Michael Park', specialty: 'Neurology', time: 'Tomorrow, 9:30 AM', rating: '4.8' }
                    ].map((doc, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-500">{doc.specialty}</div>
                          </div>
                          <div className="text-xs text-gray-500">★ {doc.rating}</div>
                        </div>
                        <div className="mt-2 text-xs text-teal-dark font-medium">{doc.time}</div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-3 py-2 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal-dark transition-colors">
                    View All Matches
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
