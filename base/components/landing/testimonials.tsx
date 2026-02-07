'use client';

import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '@/components/ui/glass-card';

const testimonials = [
  {
    quote: 'Nora matched me with a neurologist in under 2 minutes. The AI understood my symptoms better than I could explain them myself.',
    name: 'Sarah Johnson',
    role: 'Patient',
    gradient: 'from-organic-rose to-organic-peach',
  },
  {
    quote: 'The real-time availability feature saved me hours of phone calls. I booked a same-day appointment that actually worked with my schedule.',
    name: 'Michael Chen',
    role: 'Patient',
    gradient: 'from-organic-sage to-organic-mint',
  },
  {
    quote: 'As a provider, the smart scheduling has reduced our no-shows by 40%. The matching quality means patients arrive prepared.',
    name: 'Dr. Emily Rodriguez',
    role: 'Neurologist',
    gradient: 'from-organic-peach to-organic-rose',
  },
  {
    quote: 'Finally, a healthcare platform that works the way modern technology should. Simple, fast, and genuinely helpful.',
    name: 'James Patterson',
    role: 'Patient',
    gradient: 'from-organic-mint to-organic-sage',
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Autoplay carousel
  useEffect(() => {
    if (isVisible) {
      autoplayRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
      }, 5000);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isVisible]);

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    // Reset autoplay timer
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
      }, 5000);
    }
  };

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-organic-rose/5 via-white to-organic-sage/5 pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-organic-rose bg-organic-rose/10 rounded-full mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-warm-900 tracking-tight-organic">
            Trusted by thousands
          </h2>
        </div>

        {/* Featured testimonial */}
        <div 
          className={`relative transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <GlassCard 
            variant="default" 
            padding="lg" 
            rounded="3xl"
            hover={false}
            className="relative overflow-hidden"
          >
            {/* Background accent */}
            <div 
              className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${testimonials[activeIndex].gradient} transition-all duration-700`}
              style={{ transform: 'translate(30%, -30%)' }}
            />
            
            <div className="relative">
              {/* Large quote mark */}
              <svg 
                className="w-16 h-16 text-warm-200 mb-6" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              
              {/* Quote text with animation */}
              <div className="min-h-[120px] mb-8">
                <p 
                  key={activeIndex}
                  className="text-2xl md:text-3xl lg:text-4xl font-light text-warm-800 leading-relaxed animate-fade-in"
                >
                  {testimonials[activeIndex].quote}
                </p>
              </div>
              
              {/* Author info */}
              <div 
                key={`author-${activeIndex}`}
                className="flex items-center gap-4 animate-fade-in"
              >
                {/* Abstract gradient avatar */}
                <div 
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${testimonials[activeIndex].gradient} flex items-center justify-center shadow-organic-sm`}
                >
                  <span className="text-lg font-semibold text-white">
                    {testimonials[activeIndex].name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-warm-900">{testimonials[activeIndex].name}</div>
                  <div className="text-sm text-warm-500">{testimonials[activeIndex].role}</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Navigation dots */}
        <div 
          className={`flex justify-center gap-3 mt-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`relative h-2.5 rounded-full transition-all duration-500 ${
                index === activeIndex 
                  ? 'w-10 bg-gradient-to-r from-organic-sage to-organic-mint' 
                  : 'w-2.5 bg-warm-200 hover:bg-warm-300'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        {/* Mini testimonial cards preview */}
        <div 
          className={`hidden md:grid grid-cols-4 gap-4 mt-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          {testimonials.map((testimonial, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`text-left p-4 rounded-2xl transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-white shadow-organic-sm ring-2 ring-organic-sage/30' 
                  : 'bg-warm-100/50 hover:bg-white hover:shadow-organic-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}
                >
                  <span className="text-xs font-semibold text-white">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="text-sm font-medium text-warm-700 truncate">
                  {testimonial.name}
                </span>
              </div>
              <p className="text-xs text-warm-500 line-clamp-2">
                {testimonial.quote}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
