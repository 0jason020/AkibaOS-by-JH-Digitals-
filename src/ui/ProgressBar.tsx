interface ProgressBarProps {
  value: number;
  max: number;
  colorClass?: string;
  height?: string;
}

export function ProgressBar({
  value,
  max,
  colorClass = 'bg-akiba-green',
  height = 'h-2',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-navy-100 ${height}`}>
      <div
        className={`h-full rounded-full ${colorClass} transition-all duration-700 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
