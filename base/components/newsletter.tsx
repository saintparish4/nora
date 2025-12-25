'use client';

import React, { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-200">
          <div className="max-w-xl mx-auto text-center">
            {/* Header */}
            <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-3">
              Join the <span className="font-medium">movement</span>
            </h2>
            <p className="text-gray-600 mb-8">
              Stay updated with healthcare innovation and get early access to new features.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal text-sm"
                disabled={status === 'loading' || status === 'success'}
                required
              />
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="px-6 py-3 bg-[#1a1a1a] text-white font-medium rounded-lg hover:bg-black transition-colors text-sm disabled:opacity-70"
              >
                {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>

            <p className="text-xs text-gray-500 mt-4">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
