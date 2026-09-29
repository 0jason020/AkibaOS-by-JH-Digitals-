import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-2xl bg-akiba-green px-6 py-4 text-base font-semibold text-white shadow-lg shadow-akiba-green/20 transition-all active:scale-[0.98] hover:bg-akiba-green-dark disabled:opacity-50 disabled:active:scale-100 ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
