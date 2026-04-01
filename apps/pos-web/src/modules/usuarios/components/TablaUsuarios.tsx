import { Search } from 'lucide-react';
import type { FiltrosUsuario, PaginatedUsuarios, Usuario } from '../api/usuarios.api';
import { BadgeRol } from './BadgeRol';
import { BadgeEstado } from './BadgeEstado';

interface Props {
  data?: PaginatedUsuarios;
  isLoading: boolean;
  filtros: FiltrosUsuario;
  onFiltrosChange: (f: FiltrosUsuario) => void;
  onEditar?: (u: Usuario) => void;
  onDesactivar?: (id: string) => void;
  onActivar?: (id: string) => void;
  onBloquear?: (id: string) => void;
  onDesbloquear?: (id: string) => void;
  onGestionarPermisos?: (u: Usuario) => void;
  onResetPassword?: (u: Usuario) => void;
  onVerDetalle?: (u: Usuario) => void;
}

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

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface">
      <div className="grid grid-cols-1 gap-2 border-b border-outline-variant p-4 md:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant px-3 py-2">
          <Search className="h-4 w-4 text-on-surface-variant" />
          <input
            value={filtros.buscar ?? ''}
            onChange={(e) => onFiltrosChange({ ...filtros, buscar: e.target.value, page: 1 })}
            placeholder="Buscar por nombre o email"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={filtros.rol ?? ''}
          onChange={(e) =>
            onFiltrosChange({ ...filtros, rol: e.target.value || undefined, page: 1 })
          }
          className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
          <option value="CAJERO">CAJERO</option>
          <option value="BODEGUERO">BODEGUERO</option>
        </select>
        <select
          value={String(filtros.activo ?? true)}
          onChange={(e) =>
            onFiltrosChange({ ...filtros, activo: e.target.value === 'true', page: 1 })
          }
          className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
        >
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ultimo login</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const bloqueado = Boolean(
                u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date(),
              );
              return (
                <tr key={u.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3">
                    {onVerDetalle ? (
                      <button
                        className="font-semibold text-on-background underline-offset-2 hover:underline"
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
                  </td>
                  <td className="px-4 py-3">
                    <BadgeRol rol={u.rol} />
                  </td>
                  <td className="px-4 py-3">
                    <BadgeEstado activo={u.activo} bloqueadoHasta={u.bloqueadoHasta} />
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString('es-CO') : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {onEditar ? (
                        <button
                          className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                          onClick={() => onEditar(u)}
                        >
                          Editar
                        </button>
                      ) : null}
                      {onGestionarPermisos ? (
                        <button
                          className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                          onClick={() => onGestionarPermisos(u)}
                        >
                          Permisos
                        </button>
                      ) : null}
                      {onResetPassword ? (
                        <button
                          className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                          onClick={() => onResetPassword(u)}
                        >
                          Reset pass
                        </button>
                      ) : null}
                      {bloqueado ? (
                        onDesbloquear ? (
                          <button
                            className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                            onClick={() => onDesbloquear(u.id)}
                          >
                            Desbloquear
                          </button>
                        ) : null
                      ) : onBloquear ? (
                        <button
                          className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                          onClick={() => onBloquear(u.id)}
                        >
                          Bloquear
                        </button>
                      ) : null}
                      {u.activo ? (
                        onDesactivar ? (
                          <button
                            className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                            onClick={() => onDesactivar(u.id)}
                          >
                            Desactivar
                          </button>
                        ) : null
                      ) : onActivar ? (
                        <button
                          className="rounded-lg bg-surface-3 px-2 py-1 text-xs"
                          onClick={() => onActivar(u.id)}
                        >
                          Activar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  No se encontraron usuarios para los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3 text-sm">
        <span>Total: {data?.total ?? 0}</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-surface-3 px-3 py-1.5"
            disabled={(data?.page ?? 1) <= 1}
            onClick={() =>
              onFiltrosChange({ ...filtros, page: Math.max(1, (filtros.page ?? 1) - 1) })
            }
          >
            Anterior
          </button>
          <span>
            {data?.page ?? 1}/{data?.totalPages ?? 1}
          </span>
          <button
            className="rounded-lg bg-surface-3 px-3 py-1.5"
            disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)}
            onClick={() => onFiltrosChange({ ...filtros, page: (filtros.page ?? 1) + 1 })}
          >
            Siguiente
          </button>
        </div>
      </div>

      {isLoading && <div className="p-4 text-sm text-on-surface-variant">Cargando usuarios...</div>}
    </div>
  );
};
