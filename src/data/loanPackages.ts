export type LoanTier = 'starter' | 'standard' | 'high';

export interface LoanPackage {
  id: string;
  amount: number;
  fee: number;
  totalRepayable: number;
  tier: LoanTier;
  tierLabel: string;
  popular?: boolean;
}

export interface SubmittedLoan {
  reference: string;
  receiptCode?: string | null;
  pkg: LoanPackage;
  termDays: number;
  dueDate: string;
  fullName: string;
  phone: string;
  nationalId: string;
}

export const LOAN_PACKAGES: LoanPackage[] = [
  { id: 'pkg-10000', amount: 10000, fee: 99, totalRepayable: 10099, tier: 'starter', tierLabel: 'Starter' },
  { id: 'pkg-12500', amount: 12500, fee: 129, totalRepayable: 12629, tier: 'starter', tierLabel: 'Starter' },
  { id: 'pkg-16000', amount: 16000, fee: 179, totalRepayable: 16179, tier: 'starter', tierLabel: 'Starter' },
  { id: 'pkg-21000', amount: 21000, fee: 199, totalRepayable: 21199, tier: 'starter', tierLabel: 'Starter', popular: true },
  { id: 'pkg-25500', amount: 25500, fee: 220, totalRepayable: 25720, tier: 'starter', tierLabel: 'Starter' },
  { id: 'pkg-30000', amount: 30000, fee: 349, totalRepayable: 30349, tier: 'standard', tierLabel: 'Standard' },
  { id: 'pkg-35000', amount: 35000, fee: 419, totalRepayable: 35419, tier: 'standard', tierLabel: 'Standard' },
  { id: 'pkg-40000', amount: 40000, fee: 539, totalRepayable: 40539, tier: 'standard', tierLabel: 'Standard' },
  { id: 'pkg-45000', amount: 45000, fee: 679, totalRepayable: 45679, tier: 'standard', tierLabel: 'Standard' },
  { id: 'pkg-50000', amount: 50000, fee: 499, totalRepayable: 50499, tier: 'high', tierLabel: 'High Limit', popular: true },
  { id: 'pkg-60000', amount: 60000, fee: 1649, totalRepayable: 61649, tier: 'high', tierLabel: 'High Limit' },
  { id: 'pkg-70000', amount: 70000, fee: 1999, totalRepayable: 71999, tier: 'high', tierLabel: 'High Limit' },
];

export interface TermOption {
  days: number;
  label: string;
}

export const TERM_OPTIONS: TermOption[] = [
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days' },
  { days: 61, label: '61 Days' },
];

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  purpose: string;
  quote: string;
  date: string;
  initials: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'susan',
    name: 'Susan',
    location: 'Nairobi',
    purpose: 'Gift before payroll',
    quote:
      'For my friend’s wedding I needed a gift, but my payroll was a few days away. I applied on LendPlus, received approval within a couple of minutes, and bought the gift right away.',
    date: '12 Jan 2025',
    initials: 'S',
  },
  {
    id: 'david',
    name: 'David Kamau',
    location: 'Nakuru',
    purpose: 'KES 25,500 Stock Restock',
    quote:
      'Before LendPlus, waiting days for bank clearance meant missing supplier discounts. Now funds hit my M-Pesa in under two minutes with a clear KES 220 fee upfront.',
    date: '04 Feb 2025',
    initials: 'DK',
  },
  {
    id: 'grace',
    name: 'Grace Wanjiku',
    location: 'Eldoret',
    purpose: 'KES 50,000 Tuition Bridge',
    quote:
      'When my client payment was delayed, I used the Extend option directly from my dashboard to move the due date without stress or hidden penalties.',
    date: '19 Mar 2025',
    initials: 'GW',
  },
];

export function formatKES(value: number): string {
  return `KES ${value.toLocaleString('en-KE')}`;
}

export function addDaysToDate(baseDate: Date, days: number): string {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
