import { type ReactNode } from 'react';
// import { BottomNavigation } from '@/components/BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div className="relative flex min-h-full flex-col">
      <div className={`flex-1 ${showNav ? 'pb-20' : ''}`}>{children}</div>
      {/* {showNav && <BottomNavigation />} */}
    </div>
  );
}
