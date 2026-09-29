import {
  Zap,
  Droplet,
  GraduationCap,
  Smartphone,
  Wifi,
  Shield,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Calculator,
  Target,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  droplet: Droplet,
  graduationCap: GraduationCap,
  smartphone: Smartphone,
  wifi: Wifi,
  shield: Shield,
  piggyBank: PiggyBank,
  arrowDownLeft: ArrowDownLeft,
  arrowUpRight: ArrowUpRight,
  creditCard: CreditCard,
  landmark: Landmark,
  calculator: Calculator,
  target: Target,
};

interface IconRendererProps {
  name: string;
  className?: string;
}

export function IconRenderer({ name, className }: IconRendererProps) {
  const Icon = iconMap[name];
  if (Icon) return <Icon className={className} />;
  return null;
}
