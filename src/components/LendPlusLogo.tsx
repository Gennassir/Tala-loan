import React from 'react';

interface LogoProps {
  variant?: 'on-blue' | 'on-light';
  size?: 'sm' | 'md' | 'lg';
}

export const LendPlusLogo: React.FC<LogoProps> = ({
  variant = 'on-light',
  size = 'md',
}) => {
  const textColor = variant === 'on-blue' ? 'text-white' : 'text-[#0D56C6]';
  const plusTextColor = variant === 'on-blue' ? 'text-white' : 'text-[#0D56C6]';
  const ringStroke = '#FFD200';

  const sizeClasses = {
    sm: { wrap: 'gap-1.5', lend: 'text-xl', ring: 'w-9 h-9', plus: 'text-xs' },
    md: { wrap: 'gap-1.5', lend: 'text-2xl', ring: 'w-11 h-11', plus: 'text-sm' },
    lg: { wrap: 'gap-2', lend: 'text-3xl', ring: 'w-13 h-13', plus: 'text-base' },
  }[size];

  return (
    <span className={`inline-flex items-center ${sizeClasses.wrap} select-none whitespace-nowrap shrink-0`}>
      <span className={`font-display font-extrabold tracking-tight leading-none ${sizeClasses.lend} ${textColor}`}>
        Lend
      </span>
      <span className={`relative inline-flex items-center justify-center ${sizeClasses.ring}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
        >
          <path
            d="M34 9.5C30.8 7.6 27.1 6.7 23.2 7C14.1 7.7 7 15.3 7 24.5C7 34.2 14.8 42 24.5 42C34.2 42 42 34.2 42 24.5C42 22.4 41.6 20.4 41 18.6"
            stroke={ringStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M38.5 7.5V15.5M34.5 11.5H42.5"
            stroke={ringStroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
        <span className={`font-display font-bold leading-none ${sizeClasses.plus} ${plusTextColor}`}>
          plus
        </span>
      </span>
    </span>
  );
};

export const YellowUnderline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 240 16"
    fill="none"
    aria-hidden="true"
    className={`w-full h-3.5 ${className}`}
    preserveAspectRatio="none"
  >
    <path
      d="M4 11.5C68 5.2 162 4.8 236 8.5"
      stroke="#FFD200"
      strokeWidth="4.2"
      strokeLinecap="round"
    />
    <path
      d="M28 14C92 9.5 170 8.5 216 11.2"
      stroke="#FFD200"
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

export const GoldCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
    <ellipse cx="20" cy="20" rx="16" ry="11" transform="rotate(-18 20 20)" fill="#F59E0B" />
    <ellipse cx="19" cy="18.5" rx="15" ry="10" transform="rotate(-18 19 18.5)" fill="#FFD200" />
    <ellipse
      cx="19"
      cy="18.5"
      rx="10.5"
      ry="6.5"
      transform="rotate(-18 19 18.5)"
      stroke="#D97706"
      strokeWidth="1.5"
      opacity="0.55"
    />
  </svg>
);
