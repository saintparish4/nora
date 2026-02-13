'use client';

import Link from 'next/link';
import { ArrowRight, RefreshCw, Shield } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6 pb-16">
          
          {/* Hero Summary Card */}
          <div className="col-span-12 lg:col-span-8 rounded-3xl p-10 relative overflow-hidden bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-[10px] border border-[var(--glass-border)]">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
              VITAL OVERVIEW
            </div>
            <h1 className="font-serif text-[3.5rem] leading-[1.1] mb-4 font-normal tracking-[-0.01em]">
              Good morning, <br />
              <span className="italic">Elena.</span>
            </h1>
            <p className="text-[1.1rem] opacity-70 max-w-[500px] mb-8">
              Your biometric trends indicate a stable recovery phase. Aura has processed 14 new data points since your last sync.
            </p>
            <div className="flex gap-10">
              <div>
                <span className="block text-xs opacity-50 mb-1">Resting Heart Rate</span>
                <span className="font-serif text-[2rem]">64 <small className="text-base opacity-50">bpm</small></span>
              </div>
              <div>
                <span className="block text-xs opacity-50 mb-1">Sleep Efficiency</span>
                <span className="font-serif text-[2rem]">92<small className="text-base opacity-50">%</small></span>
              </div>
              <div>
                <span className="block text-xs opacity-50 mb-1">Daily Mobility</span>
                <span className="font-serif text-[2rem]">8.4<small className="text-base opacity-50">k steps</small></span>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="col-span-12 lg:col-span-4 rounded-3xl p-6 flex flex-col bg-[var(--ink-color)] text-[var(--bg-color)] border border-[var(--glass-border)]">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-40 mb-5">
              AI CLINICAL INSIGHTS
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 hover:bg-white/10 transition-all">
              <h4 className="text-[0.9rem] font-medium mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--beam-start)] rounded-full" />
                Glucose Trend
              </h4>
              <p className="text-[0.85rem] opacity-60 leading-relaxed">
                Fasting levels have stabilized by 4% since adjusting your evening ritual.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 hover:bg-white/10 transition-all">
              <h4 className="text-[0.9rem] font-medium mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--beam-start)] rounded-full" />
                Recovery Path
              </h4>
              <p className="text-[0.85rem] opacity-60 leading-relaxed">
                Mobility scores suggest you are ready to increase light activity by 10 mins.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 hover:bg-white/10 transition-all">
              <h4 className="text-[0.9rem] font-medium mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--beam-start)] rounded-full" />
                Medication Affinity
              </h4>
              <p className="text-[0.85rem] opacity-60 leading-relaxed">
                Current serum markers indicate optimal absorption of Vitamin D3 supplement.
              </p>
            </div>
            
            <div className="mt-auto border border-white/10 bg-white/5 text-[#E0F2C2] text-[0.65rem] py-2 px-3 rounded-lg uppercase tracking-[0.1em] flex items-center gap-2">
              <Shield className="w-2.5 h-2.5" />
              Clinical Analysis Active
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            <Link href="/dashboard/get-care" className="flex items-center justify-between p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
              <span>Get Care</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/providers" className="flex items-center justify-between p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
              <span>Book Specialist</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/messages" className="flex items-center justify-between p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
              <span>Message Care Team</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/labs" className="flex items-center justify-between p-5 bg-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 hover:border-foreground transition-all">
              <span>Request Lab Work</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="flex items-center justify-between p-5 bg-[var(--ink-color)] text-white border border-[var(--glass-border)] rounded-2xl hover:translate-x-1 transition-all">
              <span>Sync Health Data</span>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Medication Schedule Card */}
          <div className="col-span-12 lg:col-span-5 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5 flex justify-between items-center">
              MEDICATION SCHEDULE
            </div>
            
            <div className="flex items-center py-4 border-b border-[var(--glass-border)]">
              <div className="w-10 h-10 bg-white rounded-[10px] flex items-center justify-center mr-4 text-xl">
                💊
              </div>
              <div>
                <h4 className="font-medium">Atorvastatin</h4>
                <p className="text-[0.8rem] opacity-50">10mg • Lipid Control</p>
              </div>
              <div className="ml-auto text-[0.8rem] font-semibold opacity-80">08:00 AM</div>
            </div>
            
            <div className="flex items-center py-4 border-b border-[var(--glass-border)]">
              <div className="w-10 h-10 bg-white rounded-[10px] flex items-center justify-center mr-4 text-xl">
                🌿
              </div>
              <div>
                <h4 className="font-medium">Vitamin D3</h4>
                <p className="text-[0.8rem] opacity-50">2000 IU • Essential Supplement</p>
              </div>
              <div className="ml-auto text-[0.8rem] font-semibold opacity-80">08:00 AM</div>
            </div>
            
            <div className="flex items-center py-4 opacity-40">
              <div className="w-10 h-10 bg-white rounded-[10px] flex items-center justify-center mr-4 text-xl">
                💧
              </div>
              <div>
                <h4 className="font-medium">Magnesium Glycinate</h4>
                <p className="text-[0.8rem] opacity-50">200mg • Muscle Recovery</p>
              </div>
              <div className="ml-auto text-[0.8rem] font-semibold opacity-80">09:00 PM</div>
            </div>
          </div>

          {/* Results Card */}
          <div className="col-span-12 lg:col-span-4 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
              RECENT RESULTS
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-medium text-[0.95rem]">Metabolic Panel</h4>
                <p className="text-xs opacity-50">Oct 12, 2023</p>
              </div>
              <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#E0F2C2] font-semibold">OPTIMAL</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-medium text-[0.95rem]">Cortisol Serum</h4>
                <p className="text-xs opacity-50">Oct 10, 2023</p>
              </div>
              <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#FFD6C2] font-semibold">ELEVATED</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-medium text-[0.95rem]">CBC with Diff</h4>
                <p className="text-xs opacity-50">Sept 28, 2023</p>
              </div>
              <span className="text-[0.7rem] py-1 px-2.5 rounded-full bg-[#E0F2C2] font-semibold">OPTIMAL</span>
            </div>
            
            <Link href="/dashboard/labs/all" className="text-xs mt-3 inline-block hover:underline">
              View full medical history
            </Link>
          </div>

          {/* Upcoming Care Sessions */}
          <div className="col-span-12 rounded-3xl p-6 bg-white/40 backdrop-blur-[10px] border border-[var(--glass-border)]">
            <div className="text-xs uppercase tracking-[0.1em] font-semibold opacity-50 mb-5">
              UPCOMING CARE SESSIONS
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/20 border border-[var(--glass-border)] p-5 rounded-[20px]">
                <div className="font-serif text-2xl mb-3">Oct 24</div>
                <div className="text-[0.9rem] font-semibold mb-1">Dr. Sarah Jenkins</div>
                <div className="text-[0.8rem] opacity-60">Endocrinology • Virtual Follow-up</div>
              </div>
              
              <div className="bg-white/20 border border-[var(--glass-border)] p-5 rounded-[20px]">
                <div className="font-serif text-2xl mb-3">Nov 02</div>
                <div className="text-[0.9rem] font-semibold mb-1">Diagnostic Center</div>
                <div className="text-[0.8rem] opacity-60">Full Body MRI Scan • In-person</div>
              </div>
              
              <Link 
                href="/dashboard/appointments" 
                className="flex items-center justify-center p-5 rounded-[20px] border border-dashed border-[var(--glass-border)] bg-transparent hover:bg-white/20 transition-all"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">+</div>
                  <div className="text-[0.8rem] font-medium">Schedule New</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
  );
}
