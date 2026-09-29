import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightIcon?: LucideIcon;
  onRightClick?: () => void;
  variant?: 'light' | 'dark';
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  rightIcon: RightIcon,
  onRightClick,
  variant = 'light',
}: AppHeaderProps) {
  const navigate = useNavigate();
  const isDark = variant === 'dark';

  return (
    <div
      className={`sticky top-0 z-30 flex items-center justify-between px-5 py-4 ${
        isDark ? 'bg-navy-900 text-white' : 'bg-white text-navy-900'
      } border-b ${isDark ? 'border-white/5' : 'border-navy-100'}`}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${isDark ? 'bg-white/10' : 'bg-navy-50'} active:scale-95 transition-transform`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-navy-900'}`}>{title}</h1>
          {subtitle && <p className={`text-xs ${isDark ? 'text-white/60' : 'text-navy-400'}`}>{subtitle}</p>}
        </div>
      </div>
      {RightIcon && (
        <button
          onClick={onRightClick}
          className={`flex h-9 w-9 items-center justify-center rounded-full ${isDark ? 'bg-white/10' : 'bg-navy-50'} active:scale-95 transition-transform`}
        >
          <RightIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
