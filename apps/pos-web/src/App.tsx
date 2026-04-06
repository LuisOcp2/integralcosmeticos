import { useMemo } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PERMISOS_POR_ROL, Permiso } from '@cosmeticos/shared-types';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CajaPage from '@/pages/CajaPage';
import ClientesPage from '@/pages/clientes/ClientesPage';
import ProveedoresPage from '@/pages/proveedores/ProveedoresPage';
import OrdenesCompraPage from '@/pages/ordenes-compra/OrdenesCompraPage';
import UsuariosPage from '@/modules/usuarios/pages/UsuariosPage';
import ReportesPage from '@/modules/reportes/pages/ReportesPage';
import PosLayout from '@/layouts/PosLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

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
      return '/reportes';
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
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={redirectPath} replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            user ? (
              <PosLayout
                user={user}
                onLogout={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to={redirectPath} replace />} />

          <Route
            element={
              <ProtectedRoute requiredPermisos={[Permiso.VENTAS_VER]} redirectTo={redirectPath} />
            }
          >
            <Route path="/pos" element={<POSPage sedeId={sedeId} />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                requiredPermisos={[Permiso.CAJA_VER_HISTORIAL]}
                redirectTo={redirectPath}
              />
            }
          >
            <Route path="/caja" element={<CajaPage sedeId={sedeId} />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredPermisos={[Permiso.USUARIOS_VER]} redirectTo={redirectPath} />
            }
          >
            <Route
              path="/usuarios"
              element={<UsuariosPage onBackToPos={() => navigate('/pos', { replace: true })} />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredPermisos={[Permiso.REPORTES_VER]} redirectTo={redirectPath} />
            }
          >
            <Route path="/reportes" element={<ReportesPage sedeId={sedeId} />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredPermisos={[Permiso.CATALOGO_VER]} redirectTo={redirectPath} />
            }
          >
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/ordenes-compra" element={<OrdenesCompraPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={redirectPath} replace />} />
    </Routes>
  );
}
