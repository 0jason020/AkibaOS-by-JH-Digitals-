import { ChevronRight, type LucideIcon } from 'lucide-react';

interface BillCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  onClick: () => void;
}

export function BillCard({ name, description, icon: Icon, accent, onClick }: BillCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99] hover:shadow-md"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent} text-white`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-navy-900">{name}</h3>
        <p className="text-xs text-navy-400 truncate">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-navy-200" />
    </button>
  );
}
