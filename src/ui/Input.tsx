import { type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: string;
}

export function Input({ label, prefix, suffix, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-navy-700">{label}</label>}
      <div
        className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-4 transition-colors ${error ? 'border-rose-400' : 'border-navy-200 focus-within:border-akiba-green'}`}
      >
        {prefix && <span className="text-navy-400">{prefix}</span>}
        <input
          className={`flex-1 bg-transparent py-3.5 text-base text-navy-900 placeholder:text-navy-300 focus:outline-none ${className}`}
          {...props}
        />
        {suffix && <span className="text-navy-400">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
