import { useState } from 'react';
import {
  LOAN_PACKAGES,
  LoanPackage,
  SubmittedLoan,
  addDaysToDate,
} from './data/loanPackages';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LoanPackagesSection } from './components/LoanPackagesSection';
import { RepaymentSection } from './components/RepaymentSection';
import { TrustSecuritySection } from './components/TrustSecuritySection';
import { Footer } from './components/Footer';
import { ApplicantDetails, ApplyModal } from './components/ApplyModal';
import { StkPushModal, VerifiedPaymentData } from './components/StkPushModal';

export default function App() {
  const [selectedPackage, setSelectedPackage] = useState<LoanPackage>(LOAN_PACKAGES[3]);
  const [selectedTermDays, setSelectedTermDays] = useState<number>(30);
  const [activeLoan, setActiveLoan] = useState<SubmittedLoan | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState<boolean>(false);
  const [applicantDetails, setApplicantDetails] = useState<ApplicantDetails>({
    fullName: '',
    nationalId: '',
    phone: '',
  });
  const [isSubmittingStk, setIsSubmittingStk] = useState<boolean>(false);
  const [gatewayError, setGatewayError] = useState<string>('');

  const [stkModalOpen, setStkModalOpen] = useState<boolean>(false);
  const [activeStkPayment, setActiveStkPayment] = useState<VerifiedPaymentData | null>(null);
  const [stkTimeoutSec, setStkTimeoutSec] = useState<number>(120);

  const scrollToSection = (selector: string) => {
    const target = document.querySelector(selector);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openApplyForPackage = (pkg: LoanPackage) => {
    setSelectedPackage(pkg);
    setGatewayError('');
    setApplyModalOpen(true);
  };

  const triggerStkPush = async (details: ApplicantDetails, pkg: LoanPackage) => {
    setGatewayError('');
    setIsSubmittingStk(true);

    try {
      const response = await fetch('/api/payments/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          purpose: 'application_fee',
          fullName: details.fullName,
          nationalId: details.nationalId,
          phone: details.phone,
        }),
      });

      const body = (await response.json()) as {
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
      };

      if (!response.ok || !body.success || !body.data) {
        setGatewayError(
          body.error || 'Could not initiate M-Pesa STK push. Please check your details and try again.'
        );
        setApplyModalOpen(true);
        return;
      }

      setApplyModalOpen(false);
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
      setGatewayError('Network error while connecting to the M-Pesa payment server.');
      setApplyModalOpen(true);
    } finally {
      setIsSubmittingStk(false);
    }
  };

  const handleApplySubmit = async (details: ApplicantDetails) => {
    setApplicantDetails(details);
    await triggerStkPush(details, selectedPackage);
  };

  const handleRetryStk = async () => {
    setStkModalOpen(false);
    await triggerStkPush(applicantDetails, selectedPackage);
  };

  const handlePaymentSuccessConfirmed = (verifiedPayment: VerifiedPaymentData) => {
    setStkModalOpen(false);
    const dueDate = addDaysToDate(new Date(), selectedTermDays);
    setActiveLoan({
      reference: verifiedPayment.reference,
      receiptCode: verifiedPayment.receiptCode || null,
      pkg: selectedPackage,
      termDays: selectedTermDays,
      dueDate,
      fullName: applicantDetails.fullName,
      phone: verifiedPayment.phone,
      nationalId: applicantDetails.nationalId,
    });
    scrollToSection('#repayment');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FC] text-[#0F172A]">
      <Header onApplyClick={() => scrollToSection('#packages')} />

      <main className="flex-1">
        <HeroSection
          selectedPackage={selectedPackage}
          onSelectPackage={setSelectedPackage}
          selectedTermDays={selectedTermDays}
          onSelectTermDays={setSelectedTermDays}
          onContinueToApply={() => openApplyForPackage(selectedPackage)}
        />

        <LoanPackagesSection
          selectedPackage={selectedPackage}
          onSelectOnly={setSelectedPackage}
          onSelectAndApply={openApplyForPackage}
        />

        <RepaymentSection
          selectedPackage={selectedPackage}
          selectedTermDays={selectedTermDays}
          activeLoan={activeLoan}
        />

        <TrustSecuritySection />
      </main>

      <Footer onApplyClick={() => scrollToSection('#packages')} />

      <ApplyModal
        isOpen={applyModalOpen}
        selectedPackage={selectedPackage}
        onSelectPackage={setSelectedPackage}
        initialDetails={applicantDetails}
        isSubmitting={isSubmittingStk}
        gatewayError={gatewayError}
        onClose={() => setApplyModalOpen(false)}
        onSubmit={handleApplySubmit}
      />

      <StkPushModal
        isOpen={stkModalOpen}
        initialPayment={activeStkPayment}
        timeoutSeconds={stkTimeoutSec}
        onClose={() => setStkModalOpen(false)}
        onRetry={handleRetryStk}
        onSuccessConfirmed={handlePaymentSuccessConfirmed}
      />
    </div>
  );
}
