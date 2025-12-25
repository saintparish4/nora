'use client';

import React from 'react';

interface GradientOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'rose' | 'sage' | 'peach' | 'mint' | 'mixed';
  className?: string;
  animation?: 'float' | 'float-slow' | 'float-reverse' | 'pulse' | 'none';
  blur?: boolean;
}

const sizeClasses = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-72 h-72',
  xl: 'w-96 h-96',
};

const animationClasses = {
  float: 'animate-float',
  'float-slow': 'animate-float-slow',
  'float-reverse': 'animate-float-reverse',
  pulse: 'animate-pulse-soft',
  none: '',
};

export default function GradientOrb({
  size = 'md',
  variant = 'mixed',
  className = '',
  animation = 'float',
  blur = true,
}: GradientOrbProps) {
  const getGradient = () => {
    switch (variant) {
      case 'rose':
        return 'bg-gradient-to-br from-organic-rose to-organic-peach';
      case 'sage':
        return 'bg-gradient-to-br from-organic-sage to-organic-mint';
      case 'peach':
        return 'bg-gradient-to-br from-organic-peach to-organic-rose/50';
      case 'mint':
        return 'bg-gradient-to-br from-organic-mint to-organic-sage/50';
      case 'mixed':
      default:
        return 'bg-gradient-to-br from-organic-rose/60 via-organic-peach/40 to-organic-sage/60';
    }
  };

  return (
    <div
      className={`
        absolute rounded-full opacity-60
        ${sizeClasses[size]}
        ${getGradient()}
        ${animationClasses[animation]}
        ${blur ? 'blur-3xl' : ''}
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

