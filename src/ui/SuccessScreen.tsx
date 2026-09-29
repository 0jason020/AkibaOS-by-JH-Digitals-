import { type ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessScreenProps {
  amount?: string;
  title: string;
  subtitle?: string;
  reference?: string;
  onClose: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
  children?: ReactNode;
}

export function SuccessScreen({
  amount,
  title,
  subtitle,
  reference,
  onClose,
  onSecondary,
  secondaryLabel,
  children,
}: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center px-6 pt-12 text-center animate-scale-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-akiba-green/10">
        <CheckCircle2 className="h-12 w-12 text-akiba-green" />
      </div>
      <h1 className="text-xl font-bold text-navy-900">{title}</h1>
      {amount && <p className="mt-2 text-3xl font-extrabold text-navy-900">{amount}</p>}
      {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      {reference && (
        <div className="mt-4 w-full rounded-2xl bg-navy-50 px-4 py-3">
          <p className="text-xs text-navy-400">Reference</p>
          <p className="text-sm font-semibold text-navy-700">{reference}</p>
        </div>
      )}
      {children}
      <div className="mt-8 w-full space-y-3">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-akiba-green px-6 py-4 text-base font-semibold text-white shadow-lg shadow-akiba-green/20 transition-all active:scale-[0.98]"
        >
          Done
        </button>
        {onSecondary && secondaryLabel && (
          <button
            onClick={onSecondary}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-navy-200 bg-white px-6 py-4 text-base font-semibold text-navy-700 transition-all active:scale-[0.98]"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
