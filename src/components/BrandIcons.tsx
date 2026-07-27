import React from 'react';

export const GeminiIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M11.666 0L12.532 8.35849L21 9.33396L12.532 10.3094L11.666 18.6679L10.8001 10.3094L2.33203 9.33396L10.8001 8.35849L11.666 0Z" fill="currentColor"/>
    <path d="M18.6665 14L18.9959 17.1824L22.2221 17.5539L18.9959 17.9255L18.6665 21.1078L18.3372 17.9255L15.111 17.5539L18.3372 17.1824L18.6665 14Z" fill="currentColor"/>
    <path d="M5.00049 16.333L5.18431 18.1093L6.98561 18.3167L5.18431 18.5241L5.00049 20.3004L4.81667 18.5241L3.01538 18.3167L4.81667 18.1093L5.00049 16.333Z" fill="currentColor"/>
  </svg>
);

export const GroqIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-orange-500 ${className}`}>
    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 13.0657 15.5833 14.034 14.9048 14.7497C14.2045 15.4883 13.1678 16 12 16C9.79086 16 8 14.2091 8 12Z" fill="currentColor" fillOpacity="0.1" />
    <text x="12" y="16.5" fontSize="14" fontWeight="800" fill="currentColor" textAnchor="middle" fontFamily="sans-serif">G</text>
  </svg>
);
