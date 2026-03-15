'use client';

import Link from 'next/link';
import {
  ArrowRight,
  HeartPulse,
  Users,
  CalendarDays,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useAppointments, type Appointment } from '@/lib/api';
import { formatDateTime, formatDate } from '@/lib/format';

const UPCOMING_LIMIT = 3;
const RECENT_ACTIVITY_LIMIT = 2;

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.first_name?.trim() || user?.email?.split('@')[0] || 'there';

  const { data, isLoading: loading } = useAppointments();
  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const hasNoData = !loading && upcoming.length === 0 && past.length === 0;
  const upcomingSlice = upcoming.slice(0, UPCOMING_LIMIT);
  const recentActivity = past.slice(0, RECENT_ACTIVITY_LIMIT);

  return (
    <div className="grid grid-cols-12 gap-6 pb-16">

      {/* Hero / Welcome Card */}
      <div className="col-span-12 lg:col-span-8 rounded-3xl p-10 relative overflow-hidden bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          WELCOME BACK
        </div>
        <h1 className="font-serif text-[3.5rem] leading-[1.1] mb-4 font-normal tracking-[-0.01em]">
          {greeting}, <br />
          <span className="italic">{displayName}.</span>
        </h1>
        <p className="text-[1.1rem] opacity-70 max-w-[500px] mb-8">
          Your health dashboard — manage appointments, find providers, and get AI-powered care recommendations.
        </p>
        <Link
          href="/dashboard/get-care"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink-color)] text-[var(--bg-color)] rounded-full text-[0.9rem] font-medium hover:opacity-90 transition-all"
        >
          <HeartPulse className="w-4 h-4" />
          Get Care Now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        <Link href="/dashboard/get-care" className="flex items-center gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <span className="font-medium">Get Care</span>
            <p className="text-xs opacity-50">AI-powered symptom analysis</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-40" />
        </Link>
        <Link href="/dashboard/providers" className="flex items-center gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <span className="font-medium">Browse Providers</span>
            <p className="text-xs opacity-50">Find specialists near you</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-40" />
        </Link>
        <Link href="/dashboard/appointments" className="flex items-center gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1">
            <span className="font-medium">Appointments</span>
            <p className="text-xs opacity-50">View & manage bookings</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-40" />
        </Link>
        <Link href="/technology" className="flex items-center gap-4 p-5 bg-[var(--ink-color)] text-[var(--bg-color)] border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 transition-all">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="font-medium">SymptomX Chat</span>
            <p className="text-xs opacity-50">Talk to our AI assistant</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-40" />
        </Link>
      </div>

      {/* Get Started onboarding — when user has no appointments */}
      {hasNoData && (
        <div className="col-span-12 rounded-3xl p-6 bg-gradient-to-br from-rose-50/80 to-teal-50/80 backdrop-blur-[10px] border border-[var(--glass-border)]">
          <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
            GET STARTED
          </div>
          <p className="text-[1rem] opacity-80 mb-6 max-w-xl">
            Welcome to Nora. Here are a few ways to get the most out of your care.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/get-care"
              className="flex items-start gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:shadow-md hover:border-rose-200 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <HeartPulse className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Book your first appointment</h3>
                <p className="text-sm text-gray-600">Describe your symptoms and we’ll match you with a provider.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-rose-600">
                  Get Care <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
            <Link
              href="/technology"
              className="flex items-start gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:shadow-md hover:border-teal-200 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Chat with our symptom analyzer</h3>
                <p className="text-sm text-gray-600">SymptomX helps you understand your symptoms and next steps.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-teal-600">
                  SymptomX <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
            <Link
              href="/dashboard/providers"
              className="flex items-start gap-4 p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Browse providers</h3>
                <p className="text-sm text-gray-600">Explore specialists by specialty and location.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600">
                  Providers <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Appointments — real data */}
      {!hasNoData && (
        <div className="col-span-12 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
          <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
            UPCOMING APPOINTMENTS
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Loading appointments…
            </div>
          ) : upcomingSlice.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-gray-600">No upcoming appointments.</p>
              <Link
                href="/dashboard/get-care"
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:underline"
              >
                Book an appointment <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingSlice.map((apt) => (
                <Link
                  key={apt.id}
                  href="/dashboard/appointments"
                  className="block p-4 bg-white/60 border border-[var(--glass-border)] rounded-2xl hover:shadow-md transition-all text-left"
                >
                  <div className="font-semibold text-gray-900 truncate">
                    {apt.provider?.name ?? 'Provider'}
                  </div>
                  <p className="text-sm text-rose-600 mb-1">{apt.provider?.specialty}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                    {formatDateTime(apt.start_time)}
                  </p>
                  {apt.provider?.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {apt.provider.location}
                    </p>
                  )}
                </Link>
              ))}
              {upcoming.length > UPCOMING_LIMIT && (
                <Link
                  href="/dashboard/appointments"
                  className="flex items-center justify-center p-4 rounded-2xl border border-dashed border-[var(--glass-border)] bg-transparent hover:bg-white/20 transition-all text-sm font-medium text-gray-600"
                >
                  View all ({upcoming.length})
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity — from past appointments */}
      {!hasNoData && !loading && recentActivity.length > 0 && (
        <div className="col-span-12 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
          <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
            RECENT ACTIVITY
          </div>
          <ul className="space-y-3">
            {recentActivity.map((apt) => (
              <li key={apt.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-[var(--glass-border)]">
                {apt.status === 'cancelled' ? (
                  <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700">
                    {apt.status === 'cancelled' ? (
                      <>Cancelled appointment with {apt.provider?.name ?? 'provider'} — {formatDate(apt.start_time)}</>
                    ) : (
                      <>Completed visit with {apt.provider?.name ?? 'provider'} — {formatDate(apt.start_time)}</>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coming Soon */}
      <div className="col-span-12 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          COMING SOON
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Messaging', description: 'Secure chat with your care team', icon: '💬' },
            { label: 'Lab Results', description: 'View and track your lab work', icon: '🔬' },
            { label: 'Medications', description: 'Manage prescriptions & refills', icon: '💊' },
            { label: 'Documents', description: 'Forms, records & billing', icon: '📄' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-start gap-3 p-4 bg-white/30 border border-dashed border-[var(--glass-border)] rounded-2xl opacity-70"
            >
              <span className="text-xl mt-0.5">{feature.icon}</span>
              <div>
                <h4 className="font-medium text-[0.9rem]">{feature.label}</h4>
                <p className="text-[0.75rem] opacity-50">{feature.description}</p>
              </div>
              <Clock className="w-3.5 h-3.5 opacity-30 ml-auto mt-1 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <div className="col-span-12 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
        <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
          QUICK ACCESS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/get-care"
            className="bg-gradient-to-br from-rose-50 to-teal-50 border border-[var(--glass-border)] p-5 rounded-[20px] hover:shadow-md transition-all"
          >
            <div className="font-semibold text-[0.95rem] mb-1">Book an Appointment</div>
            <div className="text-[0.8rem] opacity-60">Describe symptoms, get matched with a provider</div>
          </Link>
          <Link
            href="/dashboard/providers"
            className="bg-white/20 border border-[var(--glass-border)] p-5 rounded-[20px] hover:shadow-md transition-all"
          >
            <div className="font-semibold text-[0.95rem] mb-1">Browse Specialists</div>
            <div className="text-[0.8rem] opacity-60">Explore providers by specialty and location</div>
          </Link>
          <Link
            href="/dashboard/appointments"
            className="flex items-center justify-center p-5 rounded-[20px] border border-dashed border-[var(--glass-border)] bg-transparent hover:bg-white/20 transition-all"
          >
            <div className="text-center">
              <CalendarDays className="w-6 h-6 mx-auto mb-2 opacity-60" />
              <div className="text-[0.8rem] font-medium">View All Appointments</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
