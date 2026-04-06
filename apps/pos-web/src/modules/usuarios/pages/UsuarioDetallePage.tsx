import { useState } from 'react';
import { useUsuario, useAuditoriaUsuario, usePermisosUsuario } from '../hooks/useUsuarios';
import { TarjetaUsuario } from '../components/TarjetaUsuario';
import { ListaAuditoria } from '../components/ListaAuditoria';
import { Permiso, PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import { Check, Minus } from 'lucide-react';
import { useSedes } from '@/hooks/useSedes';

interface Props {
  id: string;
}

const TABS = ['Información', 'Permisos', 'Auditoría'] as const;
type Tab = (typeof TABS)[number];

export const UsuarioDetallePage = ({ id }: Props) => {
  const { data: usuario, isLoading } = useUsuario(id);
  const [tab, setTab] = useState<Tab>('Información');
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditoria, isLoading: loadingAuditoria } = useAuditoriaUsuario(id, auditPage);
  const { data: permisos } = usePermisosUsuario(id);
  const { data: sedes = [] } = useSedes();
  const sedeNombre = usuario?.sedeId
    ? (sedes.find((s) => s.id === usuario.sedeId)?.nombre ?? 'Sede no disponible')
    : 'Sin asignar';

  if (isLoading || !usuario) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <TarjetaUsuario usuario={usuario} sedeNombre={sedeNombre} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-outline-variant bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === 'Información' && (
        <div className="rounded-2xl border border-outline-variant bg-surface p-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['ID', usuario.id],
              ['Email', usuario.email],
              ['Rol', usuario.rol],
              ['Sede', sedeNombre],
              ['Teléfono', usuario.telefono ?? '—'],
              ['Creado', new Date(usuario.createdAt).toLocaleString('es-CO')],
              ['Actualizado', new Date(usuario.updatedAt).toLocaleString('es-CO')],
              ['Intentos fallidos', String(usuario.intentosFallidos)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-on-surface-variant">{label}</dt>
                <dd className="font-medium text-on-background">{value}</dd>
              </div>
            ))}
          </dl>
          {usuario.notas && (
            <div className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-xs italic text-on-surface-variant">
              {usuario.notas}
            </div>
          )}
        </div>
      )}

      {/* Tab: Permisos */}
      {tab === 'Permisos' && (
        <div className="rounded-2xl border border-outline-variant bg-surface p-4">
          <div className="mb-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Check size={12} className="text-success" /> Efectivo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-primary/80" /> Extra
            </span>
            <span className="flex items-center gap-1">
              <Minus size={12} className="text-error" /> Revocado
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {Object.values(Permiso).map((p) => {
              const esBase = (
                PERMISOS_POR_ROL[usuario.rol as keyof typeof PERMISOS_POR_ROL] ?? []
              ).includes(p);
              const esExtra = permisos?.permisosExtra?.includes(p);
              const esRevocado = permisos?.permisosRevocados?.includes(p);
              const esEfectivo = [...(permisos?.permisosEfectivos ?? [])].includes(p);
              return (
                <div
                  key={p}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                    esRevocado
                      ? 'bg-error/5 text-error/60 line-through'
                      : esEfectivo
                        ? 'bg-success/5 text-on-background'
                        : 'text-on-surface-variant/50'
                  }`}
                >
                  {esRevocado ? (
                    <Minus size={11} className="text-error" />
                  ) : esEfectivo ? (
                    <Check size={11} className="text-success" />
                  ) : (
                    <Minus size={11} className="opacity-20" />
                  )}
                  <span className="font-mono">{p}</span>
                  {esExtra && !esRevocado && (
                    <span className="ml-auto rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                      extra
                    </span>
                  )}
                  {esBase && !esRevocado && !esExtra && (
                    <span className="ml-auto rounded-full bg-surface-3 px-1.5 text-[10px] text-on-surface-variant">
                      rol
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Auditoría */}
      {tab === 'Auditoría' && (
        <div>
          {loadingAuditoria ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
              ))}
            </div>
          ) : (
            <>
              <ListaAuditoria eventos={auditoria?.data ?? []} />
              {(auditoria?.total ?? 0) > 30 && (
                <div className="mt-3 flex justify-center gap-2 text-sm">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="rounded-xl border border-outline-variant px-3 py-1.5 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={(auditoria?.data.length ?? 0) < 30}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="rounded-xl border border-outline-variant px-3 py-1.5 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
