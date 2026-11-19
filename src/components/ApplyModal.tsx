import React, { useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import { LOAN_PACKAGES, LoanPackage, formatKES } from '../data/loanPackages';

export interface ApplicantDetails {
  fullName: string;
  nationalId: string;
  phone: string;
}

interface ApplyModalProps {
  isOpen: boolean;
  selectedPackage: LoanPackage;
  onSelectPackage: (pkg: LoanPackage) => void;
  initialDetails: ApplicantDetails;
  isSubmitting: boolean;
  gatewayError: string;
  onClose: () => void;
  onSubmit: (details: ApplicantDetails) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  isOpen,
  selectedPackage,
  onSelectPackage,
  initialDetails,
  isSubmitting,
  gatewayError,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState(initialDetails.fullName);
  const [nationalId, setNationalId] = useState(initialDetails.nationalId);
  const [phone, setPhone] = useState(initialDetails.phone);
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicantDetails, string>>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof ApplicantDetails, string>> = {};

    if (fullName.trim().length < 3) {
      nextErrors.fullName = 'Please enter your full name as shown on your National ID.';
    }
    if (!/^\d{7,9}$/.test(nationalId.trim())) {
      nextErrors.nationalId = 'Enter a valid 7 to 9 digit National ID number.';
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 12) {
      nextErrors.phone = 'Enter a valid Kenyan M-Pesa number (e.g. 0712345678).';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      fullName: fullName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cobalt Top Bar */}
        <div className="bg-[#0D56C6] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-blue-100">Selected Loan Package</p>
            <h3 id="apply-modal-title" className="font-display font-extrabold text-lg tabular-nums">
              {formatKES(selectedPackage.amount)} · {formatKES(selectedPackage.fee)} fee
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application form"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Quick package switcher */}
          <div className="bg-[#F6F8FC] border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">Package</span>
            <select
              aria-label="Change selected loan package"
              value={selectedPackage.id}
              onChange={(e) => {
                const found = LOAN_PACKAGES.find((p) => p.id === e.target.value);
                if (found) onSelectPackage(found);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-2 focus:outline-[#0D56C6] cursor-pointer"
            >
              {LOAN_PACKAGES.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {formatKES(pkg.amount)} ({formatKES(pkg.fee)} fee)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-full-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full name
            </label>
            <input
              id="modal-full-name"
              type="text"
              placeholder="e.g. Susan Wanjiku Mwangi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-[#0D56C6]"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label htmlFor="modal-national-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
              National ID number
            </label>
            <input
              id="modal-national-id"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 34829104"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-2 focus:outline-[#0D56C6]"
            />
            {errors.nationalId && (
              <p className="mt-1 text-xs text-red-600">{errors.nationalId}</p>
            )}
          </div>

          <div>
            <label htmlFor="modal-mpesa-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
              M-Pesa phone number
            </label>
            <input
              id="modal-mpesa-phone"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-2 focus:outline-[#0D56C6]"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>

          {gatewayError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gatewayError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#FFC700] hover:bg-[#F5B400] text-[#0F172A] font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending M-Pesa STK Push...</span>
              </>
            ) : (
              <span>Continue & Pay {formatKES(selectedPackage.fee)}</span>
            )}
          </button>

          <p className="pt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>M-Pesa STK prompt sent directly to your phone</span>
          </p>
        </form>
      </div>
    </div>
  );
};
