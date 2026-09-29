import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[390px] rounded-t-3xl bg-white p-6 pb-8 animate-slide-up safe-bottom max-h-[85%] overflow-y-auto no-scrollbar">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-navy-200" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-900">{title}</h2>
            <button onClick={onClose} className="rounded-full p-1.5 text-navy-400 hover:bg-navy-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
