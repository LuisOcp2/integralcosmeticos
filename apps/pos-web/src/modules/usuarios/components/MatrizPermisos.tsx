import { Check, Minus } from 'lucide-react';
import { Permiso, PERMISOS_POR_ROL, Rol } from '@cosmeticos/shared-types';

const TODOS_LOS_PERMISOS = Object.values(Permiso) as Permiso[];

const GRUPOS: Record<string, Permiso[]> = {
  Usuarios: TODOS_LOS_PERMISOS.filter((p) => p.startsWith('usuarios:')),
  Ventas: TODOS_LOS_PERMISOS.filter((p) => p.startsWith('ventas:')),
  Inventario: TODOS_LOS_PERMISOS.filter((p) => p.startsWith('inventario:')),
  Caja: TODOS_LOS_PERMISOS.filter((p) => p.startsWith('caja:')),
  Reportes: TODOS_LOS_PERMISOS.filter((p) => p.startsWith('reportes:')),
  Otros: TODOS_LOS_PERMISOS.filter(
    (p) =>
      !p.startsWith('usuarios:') &&
      !p.startsWith('ventas:') &&
      !p.startsWith('inventario:') &&
      !p.startsWith('caja:') &&
      !p.startsWith('reportes:'),
  ),
};

const ROL_COLORS: Record<Rol, string> = {
  SUPERADMIN: 'text-on-background font-bold',
  ADMIN: 'text-error font-bold',
  SUPERVISOR: 'text-primary font-semibold',
  CAJERO: 'text-success font-semibold',
  BODEGUERO: 'text-warning font-semibold',
};

export const MatrizPermisos = () => {
  const roles = Object.values(Rol) as Rol[];

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-2">
            <th className="sticky left-0 bg-surface-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Permiso
            </th>
            {roles.map((rol) => (
              <th
                key={rol}
                className={`px-4 py-3 text-center text-xs uppercase tracking-wide ${
                  ROL_COLORS[rol] ?? ''
                }`}
              >
                {rol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(GRUPOS).map(([grupo, permisos]) =>
            permisos.length === 0 ? null : (
              <>
                <tr key={`grupo-${grupo}`} className="bg-surface-3/50">
                  <td
                    colSpan={roles.length + 1}
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  >
                    {grupo}
                  </td>
                </tr>
                {permisos.map((permiso) => (
                  <tr
                    key={permiso}
                    className="border-t border-outline-variant transition-colors hover:bg-surface-2"
                  >
                    <td className="sticky left-0 bg-surface px-4 py-2 font-mono text-xs text-on-background">
                      {permiso}
                    </td>
                    {roles.map((rol) => {
                      const tiene = (PERMISOS_POR_ROL[rol] ?? []).includes(permiso);
                      return (
                        <td key={`${rol}-${permiso}`} className="px-4 py-2 text-center">
                          {tiene ? (
                            <Check size={14} className="mx-auto text-success" />
                          ) : (
                            <Minus size={12} className="mx-auto opacity-20" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
};
