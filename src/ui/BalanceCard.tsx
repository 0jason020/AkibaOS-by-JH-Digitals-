import { Eye, EyeOff, Plus, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRWF } from '@/utils/format';

interface BalanceCardProps {
  onAddMoney: () => void;
  onSend: () => void;
}

export function BalanceCard({ onAddMoney, onSend }: BalanceCardProps) {
  const { balance, hideBalance, setHideBalance } = useApp();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-5 shadow-xl shadow-navy-900/20">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-akiba-green/10" />
      <div className="absolute -right-12 top-10 h-24 w-24 rounded-full bg-akiba-gold/5" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Available Balance</span>
          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="text-white/60 transition-colors hover:text-white"
          >
            {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-3xl font-extrabold text-white tracking-tight">
          {hideBalance ? '•••••• RWF' : formatRWF(balance)}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onAddMoney}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-akiba-green py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] hover:bg-akiba-green-dark"
          >
            <Plus className="h-4 w-4" />
            Add Money
          </button>
          <button
            onClick={onSend}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] hover:bg-white/15"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
