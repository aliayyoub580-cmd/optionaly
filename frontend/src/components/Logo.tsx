import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="optGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#F0B90B" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#optGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4.5" stroke="#EAECEF" strokeWidth="2" />
      <path d="M14 18L18 14M18 14H16.5M18 14V15.5" stroke="#0ECB81" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
