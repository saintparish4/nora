'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'solid';
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const roundedClasses = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-[2rem]',
  '3xl': 'rounded-[2.5rem]',
};

export default function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = true,
  padding = 'md',
  rounded = 'xl',
}: GlassCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'subtle':
        return 'glass-subtle';
      case 'solid':
        return 'bg-white/90 border border-warm-100';
      case 'default':
      default:
        return 'glass';
    }
  };

  return (
    <div
      className={`
        ${getVariantClasses()}
        ${paddingClasses[padding]}
        ${roundedClasses[rounded]}
        shadow-organic-sm
        ${hover ? 'hover:shadow-organic transition-organic hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}





