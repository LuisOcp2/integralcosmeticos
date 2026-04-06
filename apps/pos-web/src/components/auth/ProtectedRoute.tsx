import { Navigate, Outlet } from 'react-router-dom';
import { PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import { useAuth } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  requiredPermisos?: string[];
  redirectTo?: string;
};

export default function ProtectedRoute({
  requiredPermisos = [],
  redirectTo = '/pos',
}: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermisos.length === 0) {
    return <Outlet />;
  }

  const permisosRol = PERMISOS_POR_ROL[user.rol as keyof typeof PERMISOS_POR_ROL] ?? [];
  const permisosExtra = user.permisosExtra ?? [];
  const revocados = new Set(user.permisosRevocados ?? []);
  const permisosEfectivos = new Set(
    [...permisosRol, ...permisosExtra].filter((permiso) => !revocados.has(permiso)),
  );

  const autorizado = requiredPermisos.every((permiso) => permisosEfectivos.has(permiso));
  if (!autorizado) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
