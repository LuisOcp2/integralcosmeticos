import { useEffect, useState } from 'react';
import { X, Check, Ban, Shield } from 'lucide-react';
import { Permiso, PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import type { Usuario } from '../api/usuarios.api';
import { usePermisosUsuario, useSetPermisos } from '../hooks/useUsuarios';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

const GRUPOS: Record<string, string[]> = {
  Usuarios: Object.values(Permiso).filter((p) => p.startsWith('usuarios:')),
  Ventas: Object.values(Permiso).filter((p) => p.startsWith('ventas:')),
  Inventario: Object.values(Permiso).filter((p) => p.startsWith('inventario:')),
  Caja: Object.values(Permiso).filter((p) => p.startsWith('caja:')),
  Reportes: Object.values(Permiso).filter((p) => p.startsWith('reportes:')),
  Otros: Object.values(Permiso).filter(
    (p) =>
      !['usuarios:', 'ventas:', 'inventario:', 'caja:', 'reportes:'].some((pref) =>
        p.startsWith(pref),
      ),
  ),
};

export const ModalGestionarPermisos = ({ usuario, onClose }: Props) => {
  const { data } = usePermisosUsuario(usuario.id);
  const setPermisos = useSetPermisos(usuario.id);
  const [motivo, setMotivo] = useState('');
  const [permisosExtra, setPermisosExtra] = useState<string[]>([]);
  const [permisosRevocados, setPermisosRevocados] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setPermisosExtra(data.permisosExtra ?? []);
      setPermisosRevocados(data.permisosRevocados ?? []);
    }
  }, [data]);

  const permisosRol = (PERMISOS_POR_ROL[usuario.rol as keyof typeof PERMISOS_POR_ROL] ?? []) as string[];

  const getEstado = (p: string): 'base' | 'extra' | 'revocado' => {
    if (permisosRevocados.includes(p)) return 'revocado';
    if (permisosExtra.includes(p)) return 'extra';
    return 'base';
  };

  const toggleExtra = (p: string) => {
    setPermisosRevocados((prev) => prev.filter((x) => x !== p));
    setPermisosExtra((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const toggleRevocar = (p: string) => {
    setPermisosExtra((prev) => prev.filter((x) => x !== p));
    setPermisosRevocados((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const efectivosCount =
    [...permisosRol, ...permisosExtra].filter((p) => !permisosRevocados.includes(p)).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-outline-variant bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <div>
              <h3 className="text-base font-bold text-on-background">
                Permisos de {usuario.nombre} {usuario.apellido}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Rol base: <strong>{usuario.rol}</strong> · {efectivosCount} permisos efectivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 border-b border-outline-variant px-5 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-surface-3" /> Del rol
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-primary" /> Extra (añadido)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-error" /> Revocado
          </span>
        </div>

        {/* Permisos */}
        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          {Object.entries(GRUPOS).map(([grupo, permisos]) =>
            permisos.length === 0 ? null : (
              <div key={grupo} className="mb-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  {grupo}
                </h4>
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {permisos.map((p) => {
                    const esBase = permisosRol.includes(p);
                    const estado = getEstado(p);
                    return (
                      <div
                        key={p}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition-colors ${
                          estado === 'revocado'
                            ? 'border-error/30 bg-error/5'
                            : estado === 'extra'
                              ? 'border-primary/30 bg-primary/5'
                              : esBase
                                ? 'border-outline-variant bg-surface-2'
                                : 'border-outline-variant bg-background'
                        }`}
                      >
                        <span
                          className={`font-mono ${
                            estado === 'revocado'
                              ? 'text-error line-through opacity-60'
                              : 'text-on-background'
                          }`}
                        >
                          {p}
                        </span>
                        <div className="flex gap-1">
                          <button
                            title="Añadir como permiso extra"
                            onClick={() => toggleExtra(p)}
                            className={`rounded-lg p-1 transition-colors ${
                              estado === 'extra'
                                ? 'bg-primary text-on-primary'
                                : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            title="Revocar permiso"
                            onClick={() => toggleRevocar(p)}
                            disabled={!esBase && estado !== 'revocado'}
                            className={`rounded-lg p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                              estado === 'revocado'
                                ? 'bg-error text-white'
                                : 'text-on-surface-variant hover:bg-error/10 hover:text-error'
                            }`}
                          >
                            <Ban size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Motivo + Footer */}
        <div className="border-t border-outline-variant px-5 py-4">
          <textarea
            rows={2}
            className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Motivo del cambio de permisos (opcional)…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={() =>
                setPermisos.mutate(
                  { permisosExtra, permisosRevocados, motivo: motivo || undefined },
                  { onSuccess: onClose },
                )
              }
              disabled={setPermisos.isPending}
            >
              {setPermisos.isPending ? 'Guardando…' : 'Guardar permisos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
