import React from 'react';
import { LendPlusLogo } from './LendPlusLogo';

interface FooterProps {
  onApplyClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onApplyClick }) => {
  return (
    <footer className="bg-[#092C6B] text-blue-100 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <LendPlusLogo variant="on-blue" size="md" />
            <p className="text-sm text-blue-100/90 max-w-sm leading-relaxed">
              It’s your best choice for fast, transparent KES personal loans delivered
              directly to M-Pesa with flexible repayment extensions.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <p className="font-display font-bold text-sm text-white">Navigation</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#packages" className="hover:text-white transition-colors">
                  Loan Packages (KES 10k–70k)
                </a>
              </li>
              <li>
                <a href="#top" className="hover:text-white transition-colors">
                  Loan Calculator
                </a>
              </li>
              <li>
                <a href="#repayment" className="hover:text-white transition-colors">
                  Repayment & Extend
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Trust & Security
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="font-display font-bold text-sm text-white">Customer Support</p>
            <p className="text-sm text-blue-100/90">
              Available Monday – Sunday · 8:00 AM – 8:00 PM EAT
            </p>
            <p className="text-sm text-white font-medium tabular-nums">
              Paybill: 402020 · Support: +254 709 000 000
            </p>
            <button
              type="button"
              onClick={onApplyClick}
              className="mt-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] rounded-xl bg-[#FFD200] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-sm transition-colors cursor-pointer"
            >
              Start Application
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-blue-200/80">
          <p>© {new Date().getFullYear()} LendPlus Web. All rights reserved.</p>
          <p>
            Borrow responsibly. Fixed package fees apply per selected KES tier (KES 99 to KES 1,999).
          </p>
        </div>
      </div>
    </footer>
  );
};
