import React from 'react';
import { Fingerprint, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { TESTIMONIALS } from '../data/loanPackages';
import { YellowUnderline } from './LendPlusLogo';

export const TrustSecuritySection: React.FC = () => {
  const securityFeatures = [
    {
      icon: Fingerprint,
      title: 'Quick biometric & PIN access',
      description:
        'Sign back in seamlessly with fingerprint verification or a 4-digit passcode without re-entering your ID details.',
    },
    {
      icon: Smartphone,
      title: 'SMS OTP & call confirmation',
      description:
        'Every loan disbursement requires a one-time code sent to your verified M-Pesa number or a live confirmation call.',
    },
    {
      icon: Lock,
      title: 'Carefully encrypted personal data',
      description:
        'Your National ID, contact records, and transaction history are stored with bank-grade encryption and strict privacy controls.',
    },
  ];

  return (
    <section id="security" className="py-16 sm:py-20 bg-[#F6F8FC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Trust & Client Stories (Matches Screenshot 5: "More than 5 000 000 clients trust us") */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-sm font-semibold text-[#0D56C6]">
                03. Reliable & Trusted Across Kenya
              </p>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight text-balance">
                More than{' '}
                <span className="relative inline-block text-[#0D56C6] tabular-nums">
                  5,000,000
                  <YellowUnderline className="mt-0.5" />
                </span>{' '}
                clients trust us
              </h2>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-600 tabular-nums">
              <div>
                <p className="font-display font-extrabold text-xl text-slate-900">80%</p>
                <p className="text-xs text-slate-500">Issued in 1 min</p>
              </div>
              <div className="h-8 w-px bg-slate-300" aria-hidden="true" />
              <div>
                <p className="font-display font-extrabold text-xl text-slate-900">24/7</p>
                <p className="text-xs text-slate-500">M-Pesa payouts</p>
              </div>
            </div>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#0D56C6] text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
                      {item.initials}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {item.location} <span aria-hidden="true">·</span> {item.purpose}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    “{item.quote}”
                  </p>
                </div>

                <p className="text-xs text-slate-400 tabular-nums">{item.date}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Security Block (Matches Screenshot 7: "We carefully store your data") */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-[#0D56C6]">It’s safe</p>
              <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
                We carefully store your data
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
              <span>Protected M-Pesa & ID Verification</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {securityFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D56C6] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
