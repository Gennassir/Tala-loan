import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LendPlusLogo } from './LendPlusLogo';

interface HeaderProps {
  onApplyClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onApplyClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#top', label: 'Calculator' },
    { href: '#packages', label: 'Loan Packages' },
    { href: '#repayment', label: 'Repay & Extend' },
    { href: '#security', label: 'Trust & Safety' },
  ];

  const handleMobileNav = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0D56C6] border-b border-white/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          aria-label="LendPlus Home"
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD200] rounded-md shrink-0"
        >
          <LendPlusLogo variant="on-blue" size="sm" />
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-blue-100"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 py-1 hover:text-white transition-colors duration-150 underline-offset-4 hover:underline decoration-[#FFD200] decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD200] rounded-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onApplyClick}
            className="whitespace-nowrap shrink-0 px-4 py-2.5 min-h-[40px] rounded-lg bg-[#FFD200] hover:bg-[#F5B400] text-[#0F172A] text-sm font-display font-bold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Apply Now
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFD200]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden bg-[#09419B] border-t border-white/15 px-4 py-3 space-y-1"
        >
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleMobileNav(link.href)}
              className="w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
