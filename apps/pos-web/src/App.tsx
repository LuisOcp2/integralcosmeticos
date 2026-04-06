import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PERMISOS_POR_ROL, Permiso } from '@cosmeticos/shared-types';
import AppRouter from '@/router';

const DEFAULT_SEDE = import.meta.env.VITE_DEFAULT_SEDE_ID ?? 'sede-default';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sedeId = user?.sedeId ?? DEFAULT_SEDE;
  const redirectPath = useMemo(() => {
    if (!user) {
      return '/login';
    }

    const permisosRol = PERMISOS_POR_ROL[user.rol as keyof typeof PERMISOS_POR_ROL] ?? [];
    const permisosExtra = user.permisosExtra ?? [];
    const revocados = new Set(user.permisosRevocados ?? []);
    const permisosEfectivos = new Set(
      [...permisosRol, ...permisosExtra].filter((permiso) => !revocados.has(permiso)),
    );

    if (permisosEfectivos.has(Permiso.VENTAS_VER)) {
      return '/pos';
    }
    if (permisosEfectivos.has(Permiso.CAJA_VER_HISTORIAL)) {
      return '/caja';
    }
    if (permisosEfectivos.has(Permiso.REPORTES_VER)) {
      return '/dashboard';
    }
    if (permisosEfectivos.has(Permiso.CATALOGO_VER)) {
      return '/proveedores';
    }
    if (permisosEfectivos.has(Permiso.USUARIOS_VER)) {
      return '/usuarios';
    }

    return '/login';
  }, [user]);

  return (
    <AppRouter
      user={user}
      sedeId={sedeId}
      redirectPath={redirectPath}
      logout={logout}
      navigateToLogin={() => navigate('/login', { replace: true })}
      navigateToPos={() => navigate('/pos', { replace: true })}
    />
  );
}
