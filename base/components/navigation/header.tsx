'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface HeaderProps {
  variant?: 'light' | 'dark';
}

export default function Header({ variant = 'light' }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'glass shadow-organic-sm py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo with breathing animation */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Image
                src="/logo2.png"
                alt="Nora logo"
                width={32}
                height={32}
                priority
                className="transition-transform duration-500 group-hover:scale-105"
              />
              {/* Subtle glow effect on hover */}
              <div className="absolute inset-0 rounded-full bg-organic-sage/0 group-hover:bg-organic-sage/20 blur-lg transition-all duration-500" />
            </div>
            <span className="text-lg font-semibold text-warm-900 tracking-tight">
              Nora
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { href: '/how-it-works', label: 'How It Works' },
              { href: '/providers', label: 'Providers' },
              { href: '/for-providers', label: 'For Providers' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 transition-colors group"
              >
                {item.label}
                {/* Organic pill background on hover */}
                <span className="absolute inset-0 rounded-full bg-warm-100/0 group-hover:bg-warm-100/80 -z-10 transition-all duration-300 scale-90 group-hover:scale-100" />
              </Link>
            ))}
            
            <div className="w-px h-6 bg-warm-200 mx-2" />
            
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 transition-colors"
            >
              Sign In
            </Link>
            
            <Link
              href="/signup"
              className="group relative px-5 py-2.5 text-sm font-medium rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Gradient background */}
              <span className="absolute inset-0 bg-warm-900 transition-all duration-300" />
              {/* Hover gradient overlay */}
              <span className="absolute inset-0 bg-gradient-to-r from-organic-sage/20 to-organic-rose/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative text-white">Get Started</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-warm-700 hover:text-warm-900 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {[
                { href: '/how-it-works', label: 'How It Works' },
                { href: '/providers', label: 'Providers' },
                { href: '/for-providers', label: 'For Providers' },
                { href: '/login', label: 'Sign In' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-3 text-sm font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-100/50 rounded-xl transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/signup"
                className="mx-4 mt-3 px-4 py-3 text-sm font-medium rounded-xl text-center bg-warm-900 text-white hover:bg-warm-900/90 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
