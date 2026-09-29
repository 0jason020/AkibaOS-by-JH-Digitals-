import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function SecondaryButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-navy-200 bg-white px-6 py-4 text-base font-semibold text-navy-700 transition-all active:scale-[0.98] hover:bg-navy-50 disabled:opacity-50 ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
