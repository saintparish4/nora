'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WavyDivider from '@/components/ui/wavy-divider';

const footerLinks = {
  product: [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/dashboard/providers', label: 'Find Providers' },
    { href: '/quick-booking', label: 'Book Now' },
  ],
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/careers', label: 'Careers' },
    { href: '/blog', label: 'Blog' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/hipaa', label: 'HIPAA Compliance' },
  ],
  support: [
    { href: '/help', label: 'Help Center' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative">
      {/* Wavy divider */}
      <WavyDivider variant="gentle" color="fill-warm-100/80" />
      
      <div className="bg-warm-100/80">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Main footer content */}
          <div className="py-16 grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                <Image
                  src="/logo2.png"
                  alt="Nora logo"
                  width={28}
                  height={28}
                  className="transition-transform group-hover:scale-105"
                />
                <span className="text-lg font-semibold text-warm-900">Nora</span>
              </Link>
              <p className="text-sm text-warm-500 leading-relaxed mb-6 max-w-xs">
                Your AI-powered health companion. From symptoms to specialist in under 2 minutes.
              </p>
              
              {/* Social links */}
              <div className="flex items-center gap-4">
                <a 
                  href="https://twitter.com" 
                  className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-warm-400 hover:text-warm-900 hover:shadow-organic-sm transition-all"
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a 
                  href="https://linkedin.com" 
                  className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-warm-400 hover:text-warm-900 hover:shadow-organic-sm transition-all"
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Link columns */}
            <div>
              <h3 className="text-sm font-semibold text-warm-900 mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-warm-500 hover:text-warm-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-warm-900 mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-warm-500 hover:text-warm-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-warm-900 mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-warm-500 hover:text-warm-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-warm-900 mb-4">Support</h3>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-sm text-warm-500 hover:text-warm-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="py-6 border-t border-warm-200/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-warm-400">
              © {new Date().getFullYear()} Nora Health. All rights reserved.
            </p>
            
            {/* Trust badges */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-warm-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-xs font-medium">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5 text-warm-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="text-xs font-medium">SOC 2 Type II</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
