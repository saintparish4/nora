'use client';

import React from 'react';
import Link from 'next/link';

export default function Providers() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6">
              Designed for{' '}
              <span className="font-medium">providers</span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed font-light">
              Smart scheduling with real-time availability syncing, automated notifications, and AI-powered patient matching to grow your practice.
            </p>

            {/* Features list */}
            <div className="space-y-4 mb-10">
              {[
                'Automated email reminders & confirmations',
                'Real-time availability management',
                'AI-matched patient referrals',
                'Comprehensive provider profiles'
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
            
            <div>
              <Link
                href="/signup?role=provider"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 transition-colors shadow-sm hover:shadow-md"
              >
                Join as Provider
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Dashboard Mockup */}
          <div
            className="relative"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Dashboard</h3>
                  <p className="text-sm text-gray-600">Welcome back, Dr. Smith</p>
                </div>
                <div className="w-8 h-8 bg-gray-900 rounded-full"></div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { value: '24', label: 'Today' },
                  { value: '156', label: 'This Week' },
                  { value: '98%', label: 'Satisfaction' }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 text-center"
                  >
                    <div className="text-xl font-semibold text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Appointments */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Appointments</h4>
                {[
                  { time: '9:00 AM', patient: 'Sarah Johnson', type: 'Follow-up' },
                  { time: '10:30 AM', patient: 'Michael Chen', type: 'Consultation' },
                  { time: '2:00 PM', patient: 'Emily Davis', type: 'Check-up' }
                ].map((appointment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.patient}
                        </div>
                        <div className="text-xs text-gray-600">
                          {appointment.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge (static) */}
            <div
              className="absolute -top-4 -right-4 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg"
            >
              Live Now
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
