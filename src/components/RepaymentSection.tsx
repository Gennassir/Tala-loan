import React, { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Gift, Info, Loader2 } from 'lucide-react';
import { LoanPackage, SubmittedLoan, addDaysToDate, formatKES } from '../data/loanPackages';
import { YellowUnderline } from './LendPlusLogo';
import { StkPushModal, VerifiedPaymentData } from './StkPushModal';

interface RepaymentSectionProps {
  selectedPackage: LoanPackage;
  selectedTermDays: number;
  activeLoan: SubmittedLoan | null;
}

type RepaymentTab = 'schedule' | 'extend' | 'loyalty';

export const RepaymentSection: React.FC<RepaymentSectionProps> = ({
  selectedPackage,
  selectedTermDays,
  activeLoan,
}) => {
  const [tab, setTab] = useState<RepaymentTab>('schedule');
  const [extensionDays, setExtensionDays] = useState<number>(14);
  const [extendedApplied, setExtendedApplied] = useState<boolean>(false);
  const [repaid, setRepaid] = useState<boolean>(false);
  const [repayPhone, setRepayPhone] = useState<string>(activeLoan?.phone || '');
  const [repayError, setRepayError] = useState<string>('');
  const [sendingStk, setSendingStk] = useState<boolean>(false);

  const [stkModalOpen, setStkModalOpen] = useState<boolean>(false);
  const [activeStkPayment, setActiveStkPayment] = useState<VerifiedPaymentData | null>(null);
  const [stkTimeoutSec, setStkTimeoutSec] = useState<number>(120);

  const displayPkg = activeLoan ? activeLoan.pkg : selectedPackage;
  const baseTermDays = activeLoan ? activeLoan.termDays : selectedTermDays;
  const effectiveDays = extendedApplied ? baseTermDays + extensionDays : baseTermDays;
  const displayDueDate = addDaysToDate(new Date(), effectiveDays);

  const daysRemaining = extendedApplied ? 3 + extensionDays : 3;

  const triggerRepaymentStk = async () => {
    setRepayError('');
    const targetPhone = (repayPhone || activeLoan?.phone || '').trim();
    if (targetPhone.replace(/\D/g, '').length < 9) {
      setRepayError('Enter your M-Pesa phone number to receive the repayment STK prompt.');
      return;
    }

    setSendingStk(true);
    try {
      const res = await fetch('/api/payments/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: displayPkg.id,
          purpose: 'repayment',
          fullName: activeLoan?.fullName || 'LendPlus Customer',
          nationalId: activeLoan?.nationalId || '12345678',
          phone: targetPhone,
        }),
      });

      const rawText = await res.text();
      let body: {
        success?: boolean;
        error?: string;
        data?: {
          reference: string;
          gatewayReference?: string | null;
          status: VerifiedPaymentData['status'];
          amount: number;
          phone: string;
          timeoutSeconds?: number;
          serverVerifiedAt?: string;
        };
      } | null = null;

      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = null;
      }

      if (!res.ok || !body?.success || !body.data) {
        setRepayError(
          body?.error ||
            `Payment server returned HTTP ${res.status}. Could not send M-Pesa repayment prompt.`
        );
        return;
      }

      setStkTimeoutSec(body.data.timeoutSeconds || 120);
      setActiveStkPayment({
        reference: body.data.reference,
        gatewayReference: body.data.gatewayReference,
        status: body.data.status,
        amount: body.data.amount,
        phone: body.data.phone,
        serverVerifiedAt: body.data.serverVerifiedAt,
      });
      setStkModalOpen(true);
    } catch {
      setRepayError('Network error while connecting to M-Pesa payment gateway.');
    } finally {
      setSendingStk(false);
    }
  };

  return (
    <section
      id="repayment"
      className="py-16 sm:py-20 bg-[#0D56C6] text-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Dashboard Preview Card */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">
                    {repaid ? 'Settled' : 'Current'}
                  </span>
                  {activeLoan && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500 tabular-nums">
                        Ref {activeLoan.reference}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {displayPkg.tierLabel} Package
                </span>
              </div>

              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tabular-nums">
                  {repaid ? 'Loan repaid in full' : `${daysRemaining} days till due`}
                </p>
                <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                    style={{ width: repaid ? '100%' : extendedApplied ? '32%' : '58%' }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500 tabular-nums">
                    Next {displayDueDate}
                  </span>
                  <span className="font-display font-bold text-slate-900 tabular-nums">
                    {repaid ? 'KES 0' : formatKES(displayPkg.totalRepayable)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                {[
                  { key: 'schedule' as const, label: 'Schedule' },
                  { key: 'extend' as const, label: 'Extend Date' },
                  { key: 'loyalty' as const, label: 'Loyalty' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`py-2 px-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      tab === item.key
                        ? 'bg-white text-[#0D56C6] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'schedule' && (
                <div className="space-y-4">
                  <div className="bg-[#F6F8FC] rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#0D56C6]" />
                        <span>Due date</span>
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {displayDueDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Principal borrowed</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatKES(displayPkg.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Fixed service fee</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatKES(displayPkg.fee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-900">M-Pesa Paybill</span>
                      <span className="font-bold text-[#0D56C6] tabular-nums">
                        402020 · Acct: Your Phone
                      </span>
                    </div>
                  </div>

                  {!repaid && (
                    <div>
                      <label
                        htmlFor="repay-mpesa-phone"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        M-Pesa phone for instant STK repayment
                      </label>
                      <input
                        id="repay-mpesa-phone"
                        type="tel"
                        placeholder="0712 345 678"
                        value={repayPhone || activeLoan?.phone || ''}
                        onChange={(e) => setRepayPhone(e.target.value)}
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 tabular-nums focus:outline-2 focus:outline-[#0D56C6]"
                      />
                    </div>
                  )}

                  {repayError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{repayError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {repaid ? (
                      <button
                        type="button"
                        onClick={() => setRepaid(false)}
                        className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0D56C6] hover:bg-[#09419B] text-white font-display font-bold text-sm transition-colors cursor-pointer"
                      >
                        Reset Loan Preview
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={triggerRepaymentStk}
                        disabled={sendingStk}
                        className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0D56C6] hover:bg-[#09419B] text-white font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {sendingStk ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending STK Push...</span>
                          </>
                        ) : (
                          <span>Pay {formatKES(displayPkg.totalRepayable)} via M-Pesa</span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setTab('extend')}
                      className="min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-display font-semibold text-sm transition-colors cursor-pointer"
                    >
                      Extend Due Date
                    </button>
                  </div>
                </div>
              )}

              {tab === 'extend' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-slate-700">
                    <Info className="w-4 h-4 text-[#0D56C6] shrink-0 mt-0.5" />
                    <span>
                      Use the extension option to delay your repayment date without impacting
                      your future eligibility.
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      Select extra days
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setExtensionDays(d);
                            setExtendedApplied(false);
                          }}
                          className={`py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer tabular-nums ${
                            extensionDays === d
                              ? 'bg-[#0D56C6] border-[#0D56C6] text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          +{d} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-sm">
                    <span className="text-emerald-900 font-medium">
                      New scheduled due date
                    </span>
                    <span className="font-display font-bold text-emerald-900 tabular-nums">
                      {addDaysToDate(new Date(), baseTermDays + extensionDays)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExtendedApplied(true);
                      setRepaid(false);
                    }}
                    className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-sm transition-colors cursor-pointer"
                  >
                    {extendedApplied
                      ? `Extension Active (+${extensionDays} Days)`
                      : `Confirm +${extensionDays} Days Extension`}
                  </button>
                </div>
              )}

              {tab === 'loyalty' && (
                <div className="space-y-3">
                  <div className="bg-emerald-600 text-white rounded-xl p-4 flex items-start gap-3">
                    <Gift className="w-5 h-5 shrink-0 mt-0.5 text-[#FFD200]" />
                    <div className="space-y-1">
                      <p className="font-display font-bold text-sm">
                        25% fee discount after your 5th repaid loan
                      </p>
                      <p className="text-xs text-emerald-50 leading-relaxed">
                        Consistent on-time repayments unlock higher loan limits up to KES 70,000
                        and automated loyalty discount codes in your LendPlus inbox.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#F6F8FC] rounded-xl p-4 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Current loyalty tier</span>
                    <span className="font-display font-bold text-[#0D56C6]">
                      1st Loan · Standard Rate
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Copy */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <p className="text-sm font-semibold text-[#FFD200]">
              02. Convenient Repayment & Extension
            </p>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight text-balance">
              If you can’t repay now, you can{' '}
              <span className="relative inline-block text-[#FFD200]">
                extend!
                <YellowUnderline className="mt-0.5" />
              </span>
            </h2>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed max-w-xl">
              Life happens and paydays shift. Whenever you need extra breathing room, extend
              your due date directly from your payment schedule by 7, 14, or 30 days—or settle
              instantly via M-Pesa STK Push.
            </p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                <dt className="text-xs text-blue-100">Instant M-Pesa Paybill</dt>
                <dd className="mt-1 font-display font-bold text-xl tabular-nums text-white">
                  Paybill 402020
                </dd>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                <dt className="text-xs text-blue-100">Repeat Borrower Reward</dt>
                <dd className="mt-1 font-display font-bold text-xl tabular-nums text-[#FFD200]">
                  Up to 25% Fee Off
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <StkPushModal
        isOpen={stkModalOpen}
        initialPayment={activeStkPayment}
        timeoutSeconds={stkTimeoutSec}
        onClose={() => setStkModalOpen(false)}
        onRetry={() => {
          setStkModalOpen(false);
          triggerRepaymentStk();
        }}
        onSuccessConfirmed={() => {
          setStkModalOpen(false);
          setRepaid(true);
        }}
      />
    </section>
  );
};
