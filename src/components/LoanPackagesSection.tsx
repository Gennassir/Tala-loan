import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, LayoutGrid, TableProperties } from 'lucide-react';
import { LOAN_PACKAGES, LoanPackage, LoanTier, formatKES } from '../data/loanPackages';

interface LoanPackagesSectionProps {
  selectedPackage: LoanPackage;
  onSelectAndApply: (pkg: LoanPackage) => void;
  onSelectOnly: (pkg: LoanPackage) => void;
}

type FilterOption = 'all' | LoanTier;
type SortOption = 'amount-asc' | 'amount-desc' | 'fee-asc';
type ViewMode = 'grid' | 'table';

export const LoanPackagesSection: React.FC<LoanPackagesSectionProps> = ({
  selectedPackage,
  onSelectAndApply,
  onSelectOnly,
}) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('amount-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredPackages = useMemo(() => {
    const base =
      filter === 'all'
        ? [...LOAN_PACKAGES]
        : LOAN_PACKAGES.filter((pkg) => pkg.tier === filter);

    base.sort((a, b) => {
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      return a.fee / a.amount - b.fee / b.amount;
    });
    return base;
  }, [filter, sortBy]);

  const filterButtons: { key: FilterOption; label: string }[] = [
    { key: 'all', label: 'All Packages (12)' },
    { key: 'starter', label: 'KES 10k – 25.5k' },
    { key: 'standard', label: 'KES 30k – 45k' },
    { key: 'high', label: 'KES 50k – 70k' },
  ];

  return (
    <section id="packages" className="scroll-mt-16 py-16 sm:py-20 bg-[#F6F8FC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-semibold text-[#0D56C6]">
              01. Transparent Loan Packages
            </p>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight text-balance">
              Fixed-fee KES packages built for clarity
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Every package carries one upfront service fee with no hidden charges. Pick the
              exact amount you need and proceed straight to M-Pesa verification.
            </p>
          </div>

          {/* Currently selected quick indicator */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shrink-0">
            <div>
              <p className="text-xs text-slate-500">Active selection</p>
              <p className="font-display font-bold text-base text-slate-900 tabular-nums">
                {formatKES(selectedPackage.amount)} · {formatKES(selectedPackage.fee)} fee
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectAndApply(selectedPackage)}
              className="px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] text-xs font-display font-bold whitespace-nowrap cursor-pointer transition-colors"
            >
              Apply Now
            </button>
          </div>
        </div>

        {/* Filter Bar + Sort + View Switch */}
        <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Filter packages by amount tier"
            className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit"
          >
            {filterButtons.map((btn) => {
              const active = filter === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setFilter(btn.key)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#0D56C6] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <label htmlFor="sort-packages" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="sort-packages"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-2 focus:outline-[#0D56C6] cursor-pointer"
            >
              <option value="amount-asc">Amount: Low to High</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="fee-asc">Lowest Fee Rate (%)</option>
            </select>

            <div className="flex items-center p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#0D56C6] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0D56C6] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableProperties className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPackages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage.id;
              const feePercent = ((pkg.fee / pkg.amount) * 100).toFixed(2);

              return (
                <div
                  key={pkg.id}
                  className={`rounded-2xl bg-white p-5 flex flex-col justify-between transition-all duration-150 ${
                    isSelected
                      ? 'border-2 border-[#0D56C6] ring-4 ring-[#0D56C6]/10'
                      : 'border border-slate-200 hover:border-[#0D56C6]/50'
                  }`}
                >
                  <div>
                    {/* Quiet unboxed metadata row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {pkg.tierLabel} <span aria-hidden="true">·</span> {feePercent}% fee
                      </span>
                      {pkg.popular && (
                        <span className="font-semibold text-[#0D56C6]">Popular</span>
                      )}
                    </div>

                    {/* Loan Amount */}
                    <p className="mt-3 font-display font-extrabold text-2xl text-slate-900 tabular-nums">
                      {formatKES(pkg.amount)}
                    </p>

                    {/* Fee & Total Repayable */}
                    <dl className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Service fee</dt>
                        <dd className="font-semibold text-[#0D56C6] tabular-nums">
                          {formatKES(pkg.fee)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500">Total repayable</dt>
                        <dd className="font-bold text-slate-900 tabular-nums">
                          {formatKES(pkg.totalRepayable)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectOnly(pkg)}
                      className={`flex-1 min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#0D56C6] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectAndApply(pkg)}
                      aria-label={`Apply for ${formatKES(pkg.amount)}`}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Apply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-5">Tier</th>
                    <th className="py-3.5 px-5">Loan Amount</th>
                    <th className="py-3.5 px-5">Fixed Fee</th>
                    <th className="py-3.5 px-5">Fee Rate</th>
                    <th className="py-3.5 px-5">Total Repayable</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPackages.map((pkg) => {
                    const isSelected = pkg.id === selectedPackage.id;
                    const feePercent = ((pkg.fee / pkg.amount) * 100).toFixed(2);
                    return (
                      <tr
                        key={pkg.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {pkg.tierLabel}
                        </td>
                        <td className="py-3.5 px-5 font-display font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatKES(pkg.amount)}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-[#0D56C6] tabular-nums whitespace-nowrap">
                          {formatKES(pkg.fee)}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 tabular-nums whitespace-nowrap">
                          {feePercent}%
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatKES(pkg.totalRepayable)}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectAndApply(pkg)}
                            className={`px-4 py-2 min-h-[36px] rounded-lg text-xs font-display font-bold transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#0D56C6] text-white'
                                : 'bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A]'
                            }`}
                          >
                            {isSelected ? 'Selected — Apply' : 'Apply'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
