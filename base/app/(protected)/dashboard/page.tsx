'use client';

import Link from 'next/link';
import { ArrowRight, HeartPulse, Users, CalendarDays, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || 'there';

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

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

          {/* Upcoming Appointments Shortcut */}
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
