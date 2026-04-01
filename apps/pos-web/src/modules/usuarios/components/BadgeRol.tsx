interface BadgeRolProps {
  rol: 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'BODEGUERO' | string;
}

const classes: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-800',
  SUPERVISOR: 'bg-amber-100 text-amber-800',
  CAJERO: 'bg-emerald-100 text-emerald-800',
  BODEGUERO: 'bg-sky-100 text-sky-800',
};

export const BadgeRol = ({ rol }: BadgeRolProps) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[rol] ?? 'bg-gray-100 text-gray-700'}`}
  >
    {rol}
  </span>
);
