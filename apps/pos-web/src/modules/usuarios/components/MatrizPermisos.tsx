import { Permiso, PERMISOS_POR_ROL, Rol } from '@cosmeticos/shared-types';

export const MatrizPermisos = () => {
  const permisos = Object.values(Permiso);
  const roles = Object.values(Rol);

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th className="px-4 py-3 text-left">Permiso</th>
            {roles.map((rol) => (
              <th key={rol} className="px-4 py-3 text-center">
                {rol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permisos.map((permiso) => (
            <tr key={permiso} className="border-t border-outline-variant">
              <td className="px-4 py-2">{permiso}</td>
              {roles.map((rol) => (
                <td key={`${rol}-${permiso}`} className="px-4 py-2 text-center">
                  {(PERMISOS_POR_ROL[rol] ?? []).includes(permiso) ? 'Si' : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
