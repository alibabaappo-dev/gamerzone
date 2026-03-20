import React from 'react';

export default function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#FFD600" rx="16" />
      <text x="100" y="115" fontFamily="Arial Black, Impact, sans-serif" fontSize="90" fontWeight="900" fill="#000000" textAnchor="middle" letterSpacing="-2">GZ</text>
      <text x="100" y="150" fontFamily="Montserrat, sans-serif" fontSize="22" fontWeight="700" fill="#000000" textAnchor="middle" letterSpacing="0.5">gamer zone</text>
    </svg>
  );
}
