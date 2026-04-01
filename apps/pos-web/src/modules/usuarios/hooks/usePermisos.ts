import { useMemo } from 'react';
import { PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import { useAuth } from '@/hooks/useAuth';

export const usePermisos = () => {
  const { user } = useAuth();

  const efectivos = useMemo(() => {
    if (!user) {
      return new Set<string>();
    }
    const permisosRol = PERMISOS_POR_ROL[user.rol as keyof typeof PERMISOS_POR_ROL] ?? [];
    const permisosExtra = user.permisosExtra ?? [];
    const revocados = new Set(user.permisosRevocados ?? []);
    return new Set([...permisosRol, ...permisosExtra].filter((p) => !revocados.has(p)));
  }, [user]);

  const tienePermiso = (permiso: string): boolean => efectivos.has(permiso);
  const tieneAlgunPermiso = (...permisos: string[]) => permisos.some(tienePermiso);
  const tieneTodosPermisos = (...permisos: string[]) => permisos.every(tienePermiso);

  return { tienePermiso, tieneAlgunPermiso, tieneTodosPermisos };
};
