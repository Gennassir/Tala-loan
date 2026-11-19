import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';
import { formatKES } from '../data/loanPackages';

export type PaymentStatus = 'pending' | 'success' | 'cancelled' | 'failed' | 'expired';

export interface VerifiedPaymentData {
  reference: string;
  gatewayReference?: string | null;
  status: PaymentStatus;
  amount: number;
  phone: string;
  receiptCode?: string | null;
  message?: string | null;
  completedAt?: string | null;
  serverVerifiedAt?: string | null;
}

interface StkPushModalProps {
  isOpen: boolean;
  initialPayment: VerifiedPaymentData | null;
  timeoutSeconds?: number;
  onClose: () => void;
  onRetry: () => void;
  onSuccessConfirmed: (payment: VerifiedPaymentData) => void;
}

export const StkPushModal: React.FC<StkPushModalProps> = ({
  isOpen,
  initialPayment,
  timeoutSeconds = 120,
  onClose,
  onRetry,
  onSuccessConfirmed,
}) => {
  const [payment, setPayment] = useState<VerifiedPaymentData | null>(initialPayment);
  const [secondsLeft, setSecondsLeft] = useState<number>(timeoutSeconds);
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    setPayment(initialPayment);
    setSecondsLeft(timeoutSeconds);
  }, [initialPayment, timeoutSeconds]);

  // Countdown timer while pending
  useEffect(() => {
    if (!isOpen || !payment || payment.status !== 'pending') return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, payment?.reference, payment?.status]);

  // Real-time Server-Sent Events subscription + fallback authoritative server poll
  useEffect(() => {
    if (!isOpen || !payment?.reference) return;
    if (payment.status !== 'pending') return;

    const ref = payment.reference;
    const eventSource = new EventSource(`/api/payments/${encodeURIComponent(ref)}/stream`);

    const handleStatusEvent = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as VerifiedPaymentData;
        setPayment(parsed);
      } catch {
        // Ignore malformed SSE keepalive payloads
      }
    };

    eventSource.addEventListener('status', handleStatusEvent);

    // Fallback poll every 4s so server always verifies against HarakaPay even if SSE is buffered
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${encodeURIComponent(ref)}`);
        if (!res.ok) return;
        const body = (await res.json()) as { success?: boolean; data?: VerifiedPaymentData };
        if (body.success && body.data) {
          setPayment(body.data);
        }
      } catch {
        // Keep trying while open
      }
    }, 4000);

    return () => {
      eventSource.removeEventListener('status', handleStatusEvent);
      eventSource.close();
      window.clearInterval(pollInterval);
    };
  }, [isOpen, payment?.reference, payment?.status]);

  const handleManualCheck = async () => {
    if (!payment?.reference) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(payment.reference)}`);
      if (res.ok) {
        const body = (await res.json()) as { success?: boolean; data?: VerifiedPaymentData };
        if (body.success && body.data) {
          setPayment(body.data);
        }
      }
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen || !payment) return null;

  const isPending = payment.status === 'pending';
  const isSuccess = payment.status === 'success';
  const isTimedOut = payment.status === 'expired';
  const isCancelledOrFailed = payment.status === 'cancelled' || payment.status === 'failed';

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stk-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-[#0D56C6] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#FFD200]" />
            <span className="font-display font-bold text-base">M-Pesa STK Push</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment window"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* STATE 1: PENDING */}
          {isPending && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-[#0D56C6] flex items-center justify-center">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#0D56C6]">
                  Awaiting M-Pesa PIN confirmation
                </p>
                <h3
                  id="stk-modal-title"
                  className="font-display font-extrabold text-xl text-slate-900"
                >
                  An STK push has been sent to your phone
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Enter your M-Pesa PIN on{' '}
                  <strong className="text-slate-900 tabular-nums">{payment.phone}</strong> to
                  complete the transaction.
                </p>
              </div>

              <div className="bg-[#F6F8FC] rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-display font-bold text-slate-900 tabular-nums">
                    {formatKES(payment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {payment.reference}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0D56C6]" />
                    <span>Verification window</span>
                  </span>
                  <span className="font-display font-bold text-[#0D56C6] tabular-nums">
                    {formatClock(secondsLeft)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Verifying with server...' : 'Verify Payment Status'}</span>
              </button>
            </div>
          )}

          {/* STATE 2: SERVER-VERIFIED SUCCESS */}
          {isSuccess && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700">
                  Server-verified payment · Success
                </p>
                <h3
                  id="stk-modal-title"
                  className="font-display font-extrabold text-xl text-slate-900"
                >
                  Success — You have paid {formatKES(payment.amount)}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your transaction is being processed.
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-emerald-900/80">Amount paid</span>
                  <span className="font-display font-bold text-emerald-900 tabular-nums">
                    {formatKES(payment.amount)}
                  </span>
                </div>
                {payment.receiptCode && (
                  <div className="flex justify-between">
                    <span className="text-emerald-900/80">M-Pesa receipt</span>
                    <span className="font-bold text-emerald-900 tabular-nums">
                      {payment.receiptCode}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-emerald-900/80">Reference</span>
                  <span className="font-semibold text-emerald-900 tabular-nums">
                    {payment.reference}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSuccessConfirmed(payment)}
                className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-base transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          )}

          {/* STATE 3: CANCELLED / FAILED (NOT PAID) */}
          {isCancelledOrFailed && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-600">
                  Server-verified status · Cancelled
                </p>
                <h3
                  id="stk-modal-title"
                  className="font-display font-extrabold text-xl text-slate-900"
                >
                  Cancelled
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {payment.message ||
                    'Payment was not completed. The M-Pesa prompt was cancelled or declined.'}
                </p>
              </div>

              <div className="bg-[#F6F8FC] rounded-xl p-4 space-y-1.5 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone number</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {payment.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatKES(payment.amount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-sm transition-colors cursor-pointer"
                >
                  Retry STK Push
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-display font-semibold text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: TRANSACTION TIMED OUT */}
          {isTimedOut && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-700">
                  Server-verified status · Expired
                </p>
                <h3
                  id="stk-modal-title"
                  className="font-display font-extrabold text-xl text-slate-900"
                >
                  Transaction Timed Out
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {payment.message ||
                    'The M-Pesa STK push prompt timed out before your PIN was entered.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-sm transition-colors cursor-pointer"
                >
                  Send New STK Push
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-display font-semibold text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <p className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified in real time by LendPlus payment server</span>
          </p>
        </div>
      </div>
    </div>
  );
};
