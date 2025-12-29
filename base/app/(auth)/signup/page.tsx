'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signup } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 md:p-8">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/signup-bg.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-5xl">
        <div className="bg-white backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3),_0_10px_30px_rgba(0,0,0,0.2),_0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden border border-gray-200">
          <div className="grid md:grid-cols-2 min-h-[600px]">
            
            {/* Left Column - Signup Form */}
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-extralight text-gray-900 mb-3 tracking-tight">
                  Welcome
                </h1>
                <p className="text-gray-500 text-sm font-light">
                  Create your account to get started
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Free Tier Notice */}
                <div className="bg-amber-50/50 border border-amber-200/30 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs text-amber-800 font-medium">Signup may take up to 50 seconds</p>
                      <p className="text-xs text-amber-700/80 mt-0.5">Free tier hosting • Please be patient</p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50/50 border border-red-200/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-3">
                      <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl transition-all duration-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 ${
                      focusedField === 'email' ? 'ring-4 ring-emerald-50 border-emerald-400' : ''
                    }`}
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl transition-all duration-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 ${
                      focusedField === 'password' ? 'ring-4 ring-emerald-50 border-emerald-400' : ''
                    }`}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl transition-all duration-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 ${
                      focusedField === 'confirmPassword' ? 'ring-4 ring-emerald-50 border-emerald-400' : ''
                    }`}
                    placeholder="Re-enter your password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-2xl font-medium transition-all duration-300 mt-6 ${
                    loading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                      <span>Creating your account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="hidden md:block relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 shadow-[inset_-15px_0_30px_-5px_rgba(0,0,0,0.25)]">
              <img 
                src="/auth/signup.jpg" 
                alt="Healthcare professionals" 
                className="w-full h-full object-cover shadow-[8px_0_40px_rgba(0,0,0,0.3),_4px_0_20px_rgba(0,0,0,0.2)]"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}