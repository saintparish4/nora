'use client';

import React from 'react';

interface WavyDividerProps {
  variant?: 'wave' | 'gentle' | 'subtle';
  flip?: boolean;
  className?: string;
  color?: string;
}

export default function WavyDivider({
  variant = 'wave',
  flip = false,
  className = '',
  color = 'fill-warm-100',
}: WavyDividerProps) {
  const getPath = () => {
    switch (variant) {
      case 'gentle':
        return 'M0,64 C320,96 640,32 960,64 C1280,96 1440,48 1440,48 L1440,100 L0,100 Z';
      case 'subtle':
        return 'M0,80 Q360,60 720,80 T1440,80 L1440,100 L0,100 Z';
      case 'wave':
      default:
        return 'M0,64 C180,100 360,20 540,64 C720,108 900,20 1080,64 C1260,108 1350,50 1440,64 L1440,100 L0,100 Z';
    }
  };

  return (
    <div
      className={`w-full overflow-hidden leading-none ${flip ? 'rotate-180' : ''} ${className}`}
      aria-hidden="true"
    >
      <svg
        className="relative block w-full h-12 md:h-16"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path
          d={getPath()}
          className={`${color} transition-colors duration-300`}
        />
      </svg>
    </div>
  );
}





