import { useState } from 'react';
import {
  Search,
  Edit2,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  UserX,
  UserCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import type { FiltrosUsuario, PaginatedUsuarios, Usuario } from '../api/usuarios.api';
import { BadgeRol } from './BadgeRol';
import { BadgeEstado } from './BadgeEstado';

interface Props {
  data?: PaginatedUsuarios;
  isLoading: boolean;
  filtros: FiltrosUsuario;
  onFiltrosChange: (_filtros: FiltrosUsuario) => void;
  onEditar?: (_usuario: Usuario) => void;
  onDesactivar?: (_id: string) => void;
  onActivar?: (_id: string) => void;
  onBloquear?: (_id: string) => void;
  onDesbloquear?: (_id: string) => void;
  onGestionarPermisos?: (_usuario: Usuario) => void;
  onResetPassword?: (_usuario: Usuario) => void;
  onVerDetalle?: (_usuario: Usuario) => void;
}

type SortField = 'nombre' | 'email' | 'rol' | 'ultimoLogin' | 'intentosFallidos';

const isBloqueado = (u: Usuario) =>
  Boolean(u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date());

const Th = ({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current?: string;
  dir?: string;
  onSort: (_field: SortField) => void;
}) => {
  const active = current === field;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant hover:text-on-background"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'ASC' ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : (
          <ChevronsUpDown size={12} className="opacity-30" />
        )}
      </span>
    </th>
  );
};

export const TablaUsuarios = ({
  data,
  isLoading,
  filtros,
  onFiltrosChange,
  onEditar,
  onDesactivar,
  onActivar,
  onBloquear,
  onDesbloquear,
  onGestionarPermisos,
  onResetPassword,
  onVerDetalle,
}: Props) => {
  const rows = data?.data ?? [];
  const [confirmDesactivar, setConfirmDesactivar] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    const newDir = filtros.orderBy === field && filtros.order === 'ASC' ? 'DESC' : 'ASC';
    onFiltrosChange({ ...filtros, orderBy: field, order: newDir, page: 1 });
  };

  const initials = (u: Usuario) => `${u.nombre[0] ?? ''}${u.apellido[0] ?? ''}`.toUpperCase();

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface">
      {/* ── Filtros ── */}
      <div className="grid grid-cols-1 gap-2 border-b border-outline-variant p-4 md:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
          <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <input
            value={filtros.buscar ?? ''}
            onChange={(e) => onFiltrosChange({ ...filtros, buscar: e.target.value, page: 1 })}
            placeholder="Nombre o email…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={filtros.rol ?? ''}
          onChange={(e) =>
            onFiltrosChange({ ...filtros, rol: e.target.value || undefined, page: 1 })
          }
          className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
          <option value="CAJERO">CAJERO</option>
          <option value="BODEGUERO">BODEGUERO</option>
        </select>
        <select
          value={filtros.activo === undefined ? '' : String(filtros.activo)}
          onChange={(e) =>
            onFiltrosChange({
              ...filtros,
              activo: e.target.value === '' ? undefined : e.target.value === 'true',
              page: 1,
            })
          }
          className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <select
          value={filtros.limit ?? 20}
          onChange={(e) => onFiltrosChange({ ...filtros, limit: Number(e.target.value), page: 1 })}
          className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Usuario
              </th>
              <Th
                label="Rol"
                field="rol"
                current={filtros.orderBy}
                dir={filtros.order}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Estado
              </th>
              <Th
                label="Último login"
                field="ultimoLogin"
                current={filtros.orderBy}
                dir={filtros.order}
                onSort={handleSort}
              />
              <Th
                label="Intentos"
                field="intentosFallidos"
                current={filtros.orderBy}
                dir={filtros.order}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? skeletonRows.map((_, i) => (
                  <tr key={i} className="border-t border-outline-variant">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded-md bg-surface-3" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((u) => {
                  const bloqueado = isBloqueado(u);
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-outline-variant transition-colors hover:bg-surface-2"
                    >
                      {/* Avatar + nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initials(u)}
                          </div>
                          <div>
                            {onVerDetalle ? (
                              <button
                                className="font-semibold text-on-background hover:underline"
                                onClick={() => onVerDetalle(u)}
                              >
                                {u.nombre} {u.apellido}
                              </button>
                            ) : (
                              <p className="font-semibold text-on-background">
                                {u.nombre} {u.apellido}
                              </p>
                            )}
                            <p className="text-xs text-on-surface-variant">{u.email}</p>
                            {u.forzarCambioPassword && (
                              <span className="mt-0.5 inline-block rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                Debe cambiar contraseña
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3">
                        <BadgeRol rol={u.rol} />
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <BadgeEstado activo={u.activo} bloqueadoHasta={u.bloqueadoHasta} />
                      </td>

                      {/* Último login */}
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {u.ultimoLogin ? (
                          <span title={new Date(u.ultimoLogin).toLocaleString('es-CO')}>
                            {new Date(u.ultimoLogin).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="italic opacity-50">Nunca</span>
                        )}
                      </td>

                      {/* Intentos fallidos */}
                      <td className="px-4 py-3">
                        {u.intentosFallidos > 0 ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              u.intentosFallidos >= 5
                                ? 'bg-error/15 text-error'
                                : u.intentosFallidos >= 3
                                  ? 'bg-warning/15 text-warning'
                                  : 'bg-surface-3 text-on-surface-variant'
                            }`}
                          >
                            {u.intentosFallidos}
                          </span>
                        ) : (
                          <span className="text-xs opacity-30">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {onEditar && (
                            <button
                              title="Editar usuario"
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                              onClick={() => onEditar(u)}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {onGestionarPermisos && (
                            <button
                              title="Gestionar permisos"
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                              onClick={() => onGestionarPermisos(u)}
                            >
                              <Shield size={15} />
                            </button>
                          )}
                          {onResetPassword && (
                            <button
                              title="Restablecer contraseña"
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-warning/10 hover:text-warning"
                              onClick={() => onResetPassword(u)}
                            >
                              <KeyRound size={15} />
                            </button>
                          )}
                          {bloqueado
                            ? onDesbloquear && (
                                <button
                                  title="Desbloquear usuario"
                                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-success/10 hover:text-success"
                                  onClick={() => onDesbloquear(u.id)}
                                >
                                  <Unlock size={15} />
                                </button>
                              )
                            : onBloquear && (
                                <button
                                  title="Bloquear 30 min"
                                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                                  onClick={() => onBloquear(u.id)}
                                >
                                  <Lock size={15} />
                                </button>
                              )}
                          {u.activo
                            ? onDesactivar && (
                                <button
                                  title="Desactivar usuario"
                                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                                  onClick={() => setConfirmDesactivar(u.id)}
                                >
                                  <UserX size={15} />
                                </button>
                              )
                            : onActivar && (
                                <button
                                  title="Activar usuario"
                                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-success/10 hover:text-success"
                                  onClick={() => onActivar(u.id)}
                                >
                                  <UserCheck size={15} />
                                </button>
                              )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-on-surface-variant">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="opacity-20" />
                    <p>No se encontraron usuarios con los filtros aplicados.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3 text-sm">
        <span className="text-on-surface-variant">
          {data?.total ?? 0} usuario{(data?.total ?? 0) !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-outline-variant px-3 py-1.5 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={(data?.page ?? 1) <= 1}
            onClick={() =>
              onFiltrosChange({ ...filtros, page: Math.max(1, (filtros.page ?? 1) - 1) })
            }
          >
            Anterior
          </button>
          <span className="text-on-surface-variant">
            {data?.page ?? 1} / {data?.totalPages ?? 1}
          </span>
          <button
            className="rounded-lg border border-outline-variant px-3 py-1.5 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)}
            onClick={() => onFiltrosChange({ ...filtros, page: (filtros.page ?? 1) + 1 })}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* ── Modal confirmación desactivar ── */}
      {confirmDesactivar && onDesactivar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface p-5 shadow-xl">
            <h3 className="text-base font-bold text-on-background">¿Desactivar usuario?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              El usuario no podrá iniciar sesión. Podrás reactivarlo en cualquier momento.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                onClick={() => setConfirmDesactivar(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 rounded-xl bg-error px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/90"
                onClick={() => {
                  onDesactivar(confirmDesactivar);
                  setConfirmDesactivar(null);
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
