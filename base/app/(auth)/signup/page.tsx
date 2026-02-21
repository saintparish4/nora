'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { toast } from 'sonner';

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' }, { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' }, { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' }, { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' }, { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' }, { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' }, { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' }, { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' }, { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
];

const inputClass =
  'w-full px-5 py-4 rounded-xl border bg-white/50 font-sans text-base text-[var(--ink-color)] outline-none transition-all duration-300 focus:border-[var(--ink-color)] focus:bg-white/80';
const inputStyle = { borderColor: 'var(--glass-border)' };
const labelClass =
  'block text-[0.7rem] uppercase tracking-[0.08em] font-semibold mb-2 opacity-70';

function SignupContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? undefined;
  const { signup } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

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
    if (!agreedToTerms) {
      setError('Please agree to the terms to continue');
      return;
    }

    setLoading(true);
    try {
      await signup(
        { email, password, first_name: firstName, last_name: lastName, state, phone: phone.replace(/\D/g, '') },
        returnUrl
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative">
      <div className="noise-overlay" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-[2]">
        <nav className="flex justify-between items-center py-8 relative z-10">
          <Link href="/" className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline">
            <span className="w-px h-6 bg-[var(--ink-color)] rotate-[15deg]" />
            nora.ai
          </Link>
          <div className="flex gap-6">
            <Link href="/specialists" className="text-[var(--ink-color)] text-[0.9rem] no-underline opacity-80 hover:opacity-100 transition-opacity">
              Specialists
            </Link>
            <Link href="/technology" className="text-[var(--ink-color)] text-[0.9rem] no-underline opacity-80 hover:opacity-100 transition-opacity">
              Technology
            </Link>
          </div>
          <Link
            href="/"
            className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[var(--ink-color)] text-[0.9rem] no-underline transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Return Home
          </Link>
        </nav>

        <section className="min-h-[calc(100vh-120px)] flex items-center justify-center py-10 relative">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[70vh] -z-[1] pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(180deg, rgba(255,156,107,0) 0%, rgba(255,156,107,0.6) 40%, rgba(224,242,194,0.6) 100%)',
                filter: 'blur(50px)',
                opacity: 0.7,
              }}
            />
          </div>

          <div
            className="w-full max-w-[520px] rounded-[var(--radius-card)] p-10 shadow-[0_20px_40px_rgba(0,0,0,0.03)]"
            style={{
              background: 'rgba(239, 238, 236, 0.4)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="font-serif text-2xl italic flex items-center justify-center gap-3 text-[var(--ink-color)] no-underline mb-5">
                <span className="w-px h-6 bg-[var(--ink-color)] rotate-[15deg]" />
                nora.ai
              </Link>
              <h1 className="font-serif text-[2rem] font-normal tracking-[-0.02em] mb-1.5">Join Nora</h1>
              <p className="text-[0.95rem] opacity-60">Your health, your way — smarter care starts here.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* First + Last Name */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1 text-left">
                  <label htmlFor="firstName" className={labelClass}>First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div className="flex-1 text-left">
                  <label htmlFor="lastName" className={labelClass}>Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="text-left mb-5">
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div className="text-left mb-5">
                <label htmlFor="password" className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`${inputClass} pr-12`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0 flex items-center"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="text-left mb-5">
                <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`${inputClass} pr-12`}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0 flex items-center"
                  >
                    {showConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* State */}
              <div className="text-left mb-5">
                <label htmlFor="state" className={labelClass}>State</label>
                <div className="relative">
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    style={inputStyle}
                  >
                    <option value="">Select your state</option>
                    {US_STATES.map((s) => (
                      <option key={s.abbr} value={s.abbr}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-50 text-sm">▾</span>
                </div>
              </div>

              {/* Phone */}
              <div className="text-left mb-5">
                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                <div
                  className="flex items-center rounded-xl border bg-white/50 transition-all duration-300 focus-within:border-[var(--ink-color)] focus-within:bg-white/80"
                  style={inputStyle}
                >
                  <span className="flex items-center gap-1.5 pl-5 pr-3 text-base opacity-70 shrink-0 select-none">
                    🇺🇸 <span className="font-medium">+1</span>
                  </span>
                  <div className="w-px self-stretch bg-[var(--glass-border)] my-3" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(555) 000-0000"
                    inputMode="numeric"
                    className="flex-1 px-4 py-4 bg-transparent font-sans text-base text-[var(--ink-color)] outline-none"
                  />
                </div>
              </div>

              {/* Policy checkbox */}
              <div className="flex items-start gap-3 mb-6">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--ink-color)]"
                />
                <label htmlFor="terms" className="text-[0.85rem] opacity-70 leading-snug cursor-pointer">
                  I agree to the{' '}
                  <Link href="#" className="underline opacity-100 hover:opacity-70 transition-opacity text-[var(--ink-color)]">
                    Usage Policy
                  </Link>
                  ,{' '}
                  <Link href="#" className="underline opacity-100 hover:opacity-70 transition-opacity text-[var(--ink-color)]">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="#" className="underline opacity-100 hover:opacity-70 transition-opacity text-[var(--ink-color)]">
                    Terms of Use
                  </Link>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50/80 border border-red-200/50 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Join Free */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[var(--ink-color)] text-white border-0 rounded-[var(--radius-pill)] font-sans text-base font-medium cursor-pointer transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {loading ? 'Creating your account…' : 'Join Free'}
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => toast.info('Google sign-up coming soon')}
                className="w-full mt-3 py-4 bg-transparent border rounded-[var(--radius-pill)] font-sans text-base font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex items-center justify-center gap-3"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--ink-color)' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.1-6.1C34.46 3.08 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.14 5.55C12.49 13.64 17.77 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.71c-.55 2.93-2.2 5.41-4.68 7.07l7.19 5.59C43.18 37.27 46.52 31.36 46.52 24.5z" />
                  <path fill="#FBBC05" d="M10.78 28.23A14.56 14.56 0 0 1 9.5 24c0-1.48.26-2.91.68-4.23l-7.14-5.55A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.57 10.77l8.21-6.54z" />
                  <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.48-4.96l-7.19-5.59C28.53 37.77 26.37 38.5 24 38.5c-6.23 0-11.51-4.14-13.22-9.77l-8.21 6.54C6.07 43.52 14.53 47 24 47z" />
                </svg>
                Sign up with Google
              </button>
            </form>

            {/* Footer */}
            <div className="mt-7 pt-6 border-t text-center" style={{ borderColor: 'var(--glass-border)' }}>
              <span className="text-[0.9rem] opacity-70">Already have an account? </span>
              <Link
                href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
                className="text-[var(--ink-color)] font-semibold text-[0.9rem] underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SignupFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans flex items-center justify-center">
      <div className="noise-overlay" />
      <p className="opacity-60">Loading…</p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupContent />
    </Suspense>
  );
}
