import { Users, UserCheck, UserX, ShieldAlert } from 'lucide-react';

interface EstadisticasProps {
  stats: {
    total: number;
    activos: number;
    inactivos: number;
    bloqueados: number;
    porRol: Record<string, number>;
  };
}

export const EstadisticasUsuarios = ({ stats }: EstadisticasProps) => {
  const cards = [
    { label: 'Total usuarios', value: stats.total, icon: Users },
    { label: 'Activos', value: stats.activos, icon: UserCheck },
    { label: 'Inactivos', value: stats.inactivos, icon: UserX },
    { label: 'Bloqueados', value: stats.bloqueados, icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-outline-variant bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">{c.label}</span>
            <c.icon className="h-4 w-4 text-on-surface-variant" />
          </div>
          <p className="mt-2 text-2xl font-bold text-on-background">{c.value}</p>
        </div>
      ))}
    </div>
  );
};
