'use client';

import React from 'react';

const features = [
  {
    title: 'Get instant recommendations based on your symptoms',
    description: 'Our AI provides personalized specialist recommendations in seconds.',
    badge: 'AI-Powered'
  },
  {
    title: 'Stay in full control of your health data',
    description: 'Track appointments, view history, and manage your healthcare journey.',
    badge: 'Secure'
  },
  {
    title: 'Get reminders and manage appointments easily',
    description: 'Never miss an appointment with smart notifications.',
    badge: 'Smart'
  }
];

export default function AppShowcase() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900">
            Personal health advisor <span className="font-medium">in your pocket</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {feature.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Phone mockups */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Main phone */}
              <div className="relative z-10">
                <div className="w-64 bg-[#1a1a1a] rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="bg-white rounded-[2rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="h-8 bg-gray-50 flex items-center justify-between px-6">
                      <span className="text-[10px] font-medium text-gray-900">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 bg-gray-800 rounded-sm" />
                      </div>
                    </div>
                    
                    {/* App content */}
                    <div className="p-4 h-[420px]">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-[10px] text-gray-500">Good morning</p>
                          <p className="text-sm font-medium text-gray-900">Sarah</p>
                        </div>
                        <div className="w-8 h-8 bg-gray-100 rounded-full" />
                      </div>
                      
                      {/* Search */}
                      <div className="bg-gray-100 rounded-xl px-4 py-3 mb-6">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-xs text-gray-400">Describe your symptoms...</span>
                        </div>
                      </div>
                      
                      {/* Quick actions */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-teal/10 rounded-xl p-4 text-center">
                          <div className="w-8 h-8 bg-teal rounded-lg mx-auto mb-2 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          <p className="text-xs font-medium text-gray-700">New Booking</p>
                        </div>
                        <div className="bg-gray-100 rounded-xl p-4 text-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-xs font-medium text-gray-600">My Appts</p>
                        </div>
                      </div>
                      
                      {/* Upcoming */}
                      <div>
                        <p className="text-xs text-gray-500 mb-3">Upcoming appointment</p>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-sm font-semibold text-gray-900 border border-gray-200">
                              24
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Dr. Sarah Chen</p>
                              <p className="text-xs text-gray-500">Neurology • 2:00 PM</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Secondary phone (offset behind) */}
              <div className="absolute -right-16 top-8 opacity-40">
                <div className="w-52 bg-gray-800 rounded-[2rem] p-2">
                  <div className="bg-white rounded-[1.5rem] h-[360px]">
                    <div className="h-6 bg-gray-50 rounded-t-[1.5rem]" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-20 bg-gray-50 rounded-lg mt-4" />
                      <div className="h-20 bg-gray-50 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
