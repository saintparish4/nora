'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FlowingLineProps {
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  animated?: boolean;
}

export default function FlowingLine({
  className = '',
  strokeColor = 'stroke-organic-sage',
  strokeWidth = 2,
  animated = true,
}: FlowingLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!animated) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (pathRef.current) {
      observer.observe(pathRef.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="flowingLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.85 0.08 15)" stopOpacity="0.3" />
          <stop offset="50%" stopColor="oklch(0.82 0.06 155)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="oklch(0.92 0.04 165)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d="M0,50 Q250,20 500,50 T1000,50"
        fill="none"
        stroke="url(#flowingLineGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={`
          ${strokeColor}
          ${isVisible && animated ? 'animate-draw-line' : ''}
          ${!animated || isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          strokeDasharray: animated ? 1000 : 0,
          strokeDashoffset: animated && !isVisible ? 1000 : 0,
          transition: 'stroke-dashoffset 2s ease-out',
        }}
      />
    </svg>
  );
}

