import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

/**
 * Seshat Geometric 7-Pointed Star Mark
 * Exact mathematical heptagram motif per PRD Section 9.3
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'text-[var(--color-accent)]', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path
        d="M 32 6
           L 36.85 20.35
           L 51.57 16.89
           L 44.22 30.04
           L 57.57 37.89
           L 42.42 41.65
           L 44.57 56.89
           L 32 48.0
           L 19.43 56.89
           L 21.58 41.65
           L 6.43 37.89
           L 19.78 30.04
           L 12.43 16.89
           L 27.15 20.35 Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
};

