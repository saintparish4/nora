'use client';

import React from 'react';

export default function Comparison() {
  const comparisons = [
    {
      feature: 'Specialization',
      chatgpt: 'General-purpose AI',
      nora: 'Medical healthcare focused',
      noraAdvantage: true
    },
    {
      feature: 'Provider Matching',
      chatgpt: 'Not available',
      nora: 'AI-powered specialist matching',
      noraAdvantage: true
    },
    {
      feature: 'Appointment Booking',
      chatgpt: 'Not available',
      nora: 'Real-time scheduling & booking',
      noraAdvantage: true
    },
    {
      feature: 'Insurance Integration',
      chatgpt: 'Not available',
      nora: 'Filters by insurance acceptance',
      noraAdvantage: true
    },
    {
      feature: 'Symptom Analysis',
      chatgpt: 'General conversation',
      nora: 'Medical-grade symptom triage',
      noraAdvantage: true
    },
    {
      feature: 'Urgency Assessment',
      chatgpt: 'Not specialized',
      nora: 'Emergency routing & urgency levels',
      noraAdvantage: true
    },
    {
      feature: 'Use Cases',
      chatgpt: 'General questions, coding, writing',
      nora: 'Healthcare navigation & booking',
      noraAdvantage: false
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 leading-tight mb-4">
            ChatGPT vs <span className="font-medium">Nora</span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            See how Nora&apos;s specialized medical AI compares to general-purpose ChatGPT
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* ChatGPT Card */}
          <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-medium text-gray-900">ChatGPT</h3>
                <p className="text-sm text-gray-600">General-purpose AI</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                'General conversation & questions',
                'Code generation & debugging',
                'Creative writing & content',
                'Broad knowledge base',
                'No medical integration'
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Nora Card */}
          <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-800 relative overflow-hidden">
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="bg-white text-gray-900 text-xs font-medium px-3 py-1 rounded-full">
                Healthcare Specialized
              </span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-xl font-medium text-gray-900">N</span>
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white">Nora</h3>
                <p className="text-sm text-gray-400">Medical AI Platform</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                'Medical symptom analysis',
                'AI-powered provider matching',
                'Real-time appointment booking',
                'Insurance acceptance filtering',
                'Emergency routing & triage'
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-white mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-100">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
          <h3 className="text-2xl font-medium text-gray-900 mb-6">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">Feature</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">ChatGPT</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-900">Nora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparisons.map((comparison, index) => (
                  <tr key={index} className="hover:bg-gray-100/50 transition-colors">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{comparison.feature}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{comparison.chatgpt}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${comparison.noraAdvantage ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {comparison.nora}
                        </span>
                        {comparison.noraAdvantage && (
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Advantage Section */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium text-white mb-2">Why Choose Nora for Healthcare?</h3>
              <p className="text-gray-300 leading-relaxed">
                While ChatGPT excels at general conversation, Nora is purpose-built for healthcare. It combines OpenAI&apos;s powerful GPT technology with specialized medical knowledge, provider databases, and booking systems to deliver an end-to-end healthcare navigation experience. Nora doesn&apos;t just answer questions—it matches you with the right specialist and books your appointment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

