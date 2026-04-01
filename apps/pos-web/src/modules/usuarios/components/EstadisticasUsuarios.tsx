import { Users, UserCheck, UserX, ShieldAlert } from 'lucide-react';
import { useEstadisticasUsuarios } from '../hooks/useUsuarios';

const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
  BODEGUERO: 'Bodeguero',
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: 'bg-error/10 text-error',
  SUPERVISOR: 'bg-primary/10 text-primary',
  CAJERO: 'bg-success/10 text-success',
  BODEGUERO: 'bg-warning/10 text-warning',
};

export const EstadisticasUsuarios = ({ stats: statsProp }: { stats?: unknown }) => {
  const { data: statsApi, isLoading } = useEstadisticasUsuarios();
  const stats = (statsProp ?? statsApi) as
    | { total: number; activos: number; inactivos: number; bloqueados: number; porRol: Record<string, number> }
    | undefined;

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'Activos', value: stats.activos, icon: UserCheck, color: 'bg-success/10 text-success' },
    { label: 'Inactivos', value: stats.inactivos, icon: UserX, color: 'bg-surface-3 text-on-surface-variant' },
    { label: 'Bloqueados', value: stats.bloqueados, icon: ShieldAlert, color: 'bg-error/10 text-error' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-outline-variant bg-surface p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                {c.label}
              </span>
              <div className={`rounded-lg p-1.5 ${c.color}`}>
                <c.icon size={14} />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-on-background">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Distribución por rol */}
      {stats.porRol && Object.keys(stats.porRol).length > 0 && (
        <div className="rounded-2xl border border-outline-variant bg-surface p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Distribución por rol
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.porRol).map(([rol, count]) => (
              <div
                key={rol}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium ${
                  ROL_COLORS[rol] ?? 'bg-surface-3 text-on-surface-variant'
                }`}
              >
                <span>{ROL_LABELS[rol] ?? rol}</span>
                <span className="rounded-full bg-white/40 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
