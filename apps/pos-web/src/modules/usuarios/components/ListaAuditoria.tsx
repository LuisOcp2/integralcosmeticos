import { useState } from 'react';
import {
  LogIn,
  LogOut,
  UserPlus,
  UserCog,
  KeyRound,
  Lock,
  Unlock,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { AuditoriaUsuario } from '../api/usuarios.api';

const ACTION_ICONS: Record<string, React.ElementType> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  CREAR: UserPlus,
  ACTUALIZAR: UserCog,
  RESET_PASSWORD: KeyRound,
  CAMBIAR_PASSWORD: KeyRound,
  BLOQUEAR: Lock,
  DESBLOQUEAR: Unlock,
  CAMBIAR_PERMISOS: ShieldCheck,
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-success/10 text-success',
  LOGOUT: 'bg-surface-3 text-on-surface-variant',
  CREAR: 'bg-primary/10 text-primary',
  ACTUALIZAR: 'bg-primary/10 text-primary',
  RESET_PASSWORD: 'bg-warning/10 text-warning',
  CAMBIAR_PASSWORD: 'bg-warning/10 text-warning',
  BLOQUEAR: 'bg-error/10 text-error',
  DESBLOQUEAR: 'bg-success/10 text-success',
  CAMBIAR_PERMISOS: 'bg-primary/10 text-primary',
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const DiffBlock = ({ label, data }: { label: string; data: Record<string, unknown> | null }) => {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mt-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <pre className="mt-0.5 overflow-x-auto rounded-lg bg-surface-3 px-2 py-1 text-[10px] leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const EventoItem = ({ evento }: { evento: AuditoriaUsuario }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = ACTION_ICONS[evento.accion] ?? UserCog;
  const colorClass = ACTION_COLORS[evento.accion] ?? 'bg-surface-3 text-on-surface-variant';
  const hasDiff = evento.datosAnteriores ?? evento.datosNuevos;

  return (
    <div className="flex gap-3">
      {/* Línea de tiempo */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
          <Icon size={14} />
        </div>
        <div className="mt-1 w-px flex-1 bg-outline-variant" />
      </div>

      {/* Contenido */}
      <div className="mb-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-on-background">{evento.accion}</p>
            <p className="text-xs text-on-surface-variant">{formatDate(evento.createdAt)}</p>
          </div>
          {hasDiff && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-2"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Detalle
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-2 text-xs text-on-surface-variant">
          {evento.realizadoPorId && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              Actor: {evento.realizadoPorId}
            </span>
          )}
          {evento.ip && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5">IP: {evento.ip}</span>
          )}
          {evento.motivo && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5">Motivo: {evento.motivo}</span>
          )}
        </div>

        {expanded && hasDiff && (
          <div className="mt-2 rounded-xl border border-outline-variant bg-background p-2">
            <DiffBlock label="Antes" data={evento.datosAnteriores} />
            <DiffBlock label="Después" data={evento.datosNuevos} />
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  eventos: AuditoriaUsuario[];
}

export const ListaAuditoria = ({ eventos }: Props) => {
  if (!eventos.length) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface px-4 py-10 text-center">
        <p className="text-sm text-on-surface-variant">Sin eventos de auditoría registrados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      {eventos.map((e) => (
        <EventoItem key={e.id} evento={e} />
      ))}
    </div>
  );
};
