interface StatusBadgeProps {
  status: 'successful' | 'pending' | 'failed';
}

const config = {
  successful: { label: 'Successful', class: 'bg-akiba-green/10 text-akiba-green-dark', dot: 'bg-akiba-green' },
  pending: { label: 'Pending', class: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  failed: { label: 'Failed', class: 'bg-rose-100 text-rose-600', dot: 'bg-rose-500' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.class}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
