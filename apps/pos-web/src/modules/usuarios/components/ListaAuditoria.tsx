import type { AuditoriaUsuario } from '../api/usuarios.api';

interface EventoAuditoria extends AuditoriaUsuario {
  id: string;
  accion: string;
  realizadoPorId: string | null;
  motivo: string | null;
  createdAt: string;
}

interface Props {
  eventos: EventoAuditoria[];
}

export const ListaAuditoria = ({ eventos }: Props) => {
  if (!eventos.length) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface p-4 text-sm">
        Sin eventos de auditoria
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {eventos.map((e) => (
        <div key={e.id} className="rounded-2xl border border-outline-variant bg-surface p-3">
          <p className="text-sm font-semibold">{e.accion}</p>
          <p className="text-xs text-on-surface-variant">
            {new Date(e.createdAt).toLocaleString('es-CO')}
          </p>
          {e.realizadoPorId ? (
            <p className="mt-1 text-xs text-on-surface-variant">Actor: {e.realizadoPorId}</p>
          ) : null}
          {e.motivo ? <p className="mt-1 text-xs">{e.motivo}</p> : null}
          {e.ip ? <p className="mt-1 text-xs text-on-surface-variant">IP: {e.ip}</p> : null}
        </div>
      ))}
    </div>
  );
};
