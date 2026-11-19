import React from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import {
  LOAN_PACKAGES,
  LoanPackage,
  TERM_OPTIONS,
  addDaysToDate,
  formatKES,
} from '../data/loanPackages';
import { GoldCoinIcon, YellowUnderline } from './LendPlusLogo';

interface HeroSectionProps {
  selectedPackage: LoanPackage;
  onSelectPackage: (pkg: LoanPackage) => void;
  selectedTermDays: number;
  onSelectTermDays: (days: number) => void;
  onContinueToApply: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  selectedPackage,
  onSelectPackage,
  selectedTermDays,
  onSelectTermDays,
  onContinueToApply,
}) => {
  const currentIndex = LOAN_PACKAGES.findIndex((p) => p.id === selectedPackage.id);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < LOAN_PACKAGES.length - 1;

  const quickPickAmounts = [10000, 21000, 50000, 70000];
  const dueDateLabel = addDaysToDate(new Date(), selectedTermDays);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const pkg = LOAN_PACKAGES[idx];
    if (pkg) onSelectPackage(pkg);
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-[#0D56C6] via-[#0C4EB8] to-[#09419B] text-white"
    >
      {/* Subtle geometric upward arrow backdrop motif */}
      <svg
        aria-hidden="true"
        viewBox="0 0 600 420"
        fill="none"
        className="pointer-events-none absolute -right-12 -bottom-10 w-[440px] sm:w-[560px] opacity-10"
      >
        <path
          d="M40 380C180 355 310 275 430 120M430 120L325 135M430 120L425 225"
          stroke="#FFFFFF"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Subtle gold coin accents */}
      <GoldCoinIcon className="hidden lg:block pointer-events-none absolute top-14 left-[44%] w-10 h-10 opacity-85" />
      <GoldCoinIcon className="hidden lg:block pointer-events-none absolute bottom-16 left-[38%] w-7 h-7 opacity-75" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Brand Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-sm font-medium text-blue-100 tracking-wide">
              Loans from KES 10,000 to KES 70,000 · Direct to M-Pesa
            </p>

            <h1 className="font-display font-extrabold text-[clamp(2.25rem,4.2vw,3.5rem)] leading-[1.08] tracking-tight text-balance">
              All your needs{' '}
              <span className="relative inline-block whitespace-nowrap text-[#FFD200]">
                in one loan app
                <YellowUnderline className="mt-1" />
              </span>
            </h1>

            <p className="text-base sm:text-lg text-blue-100 leading-relaxed max-w-xl">
              80% of approved loans are issued in 1 minute. Apply online with only your
              National ID number and M-Pesa phone number—zero paperwork and clear fixed fees.
            </p>

            {/* Unboxed proof strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-white pt-1">
              <span className="tabular-nums">80% issued in 1 min</span>
              <span aria-hidden="true" className="text-blue-300">·</span>
              <span className="tabular-nums">5,000,000+ clients</span>
              <span aria-hidden="true" className="text-blue-300">·</span>
              <span>Flexible due-date extend</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#packages"
                className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white text-sm font-display font-semibold transition-colors duration-150 whitespace-nowrap"
              >
                Compare All 12 Packages
              </a>
              <a
                href="#repayment"
                className="text-sm font-semibold text-[#FFD200] hover:underline underline-offset-4 py-2 whitespace-nowrap"
              >
                See flexible extension options
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Quick Calculator Card */}
          <div className="lg:col-span-6">
            <div className="bg-white text-[#0F172A] rounded-2xl p-6 sm:p-8 shadow-2xl border border-blue-900/10">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Selected Package · {selectedPackage.tierLabel}
                  </p>
                  <p className="mt-1 font-display font-extrabold text-3xl sm:text-4xl text-[#0D56C6] tabular-nums">
                    {formatKES(selectedPackage.amount)}
                  </p>
                </div>

                {/* Step - / + buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => canDecrease && onSelectPackage(LOAN_PACKAGES[currentIndex - 1])}
                    disabled={!canDecrease}
                    aria-label="Decrease loan amount"
                    className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => canIncrease && onSelectPackage(LOAN_PACKAGES[currentIndex + 1])}
                    disabled={!canIncrease}
                    aria-label="Increase loan amount"
                    className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 12-Step Range Slider */}
              <div className="py-5 space-y-3">
                <label htmlFor="loan-slider" className="sr-only">
                  Choose loan package amount
                </label>
                <input
                  id="loan-slider"
                  type="range"
                  min={0}
                  max={LOAN_PACKAGES.length - 1}
                  step={1}
                  value={currentIndex}
                  onChange={handleSliderChange}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D56C6]"
                />
                <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                  <span>KES 10,000</span>
                  <span>Step {currentIndex + 1} of {LOAN_PACKAGES.length}</span>
                  <span>KES 70,000</span>
                </div>

                {/* Quick Pick Preset Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {quickPickAmounts.map((amt) => {
                    const pkg = LOAN_PACKAGES.find((p) => p.amount === amt);
                    if (!pkg) return null;
                    const active = pkg.id === selectedPackage.id;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => onSelectPackage(pkg)}
                        className={`py-2 px-2 min-h-[40px] rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#0D56C6] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {(amt / 1000).toFixed(0)}k
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Repayment Term Segmented Control */}
              <div className="pb-5">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Choose repayment schedule
                </p>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {TERM_OPTIONS.map((term) => {
                    const active = selectedTermDays === term.days;
                    return (
                      <button
                        key={term.days}
                        type="button"
                        onClick={() => onSelectTermDays(term.days)}
                        className={`py-2 px-3 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-white text-[#0D56C6] shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {term.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transparent Fee & Total Breakdown */}
              <div className="bg-[#F6F8FC] rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">You receive via M-Pesa</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatKES(selectedPackage.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Fixed package fee</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatKES(selectedPackage.fee)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Due date ({selectedTermDays} days)</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {dueDateLabel}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-display font-bold text-slate-900">
                    Total repayable
                  </span>
                  <span className="font-display font-extrabold text-lg text-[#0D56C6] tabular-nums">
                    {formatKES(selectedPackage.totalRepayable)}
                  </span>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={onContinueToApply}
                className="mt-5 w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-base flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D56C6]"
              >
                <span>Continue with {formatKES(selectedPackage.amount)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
