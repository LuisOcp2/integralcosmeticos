import { Navigate, Route, Routes } from 'react-router-dom';
import { Permiso } from '@cosmeticos/shared-types';
import type { AuthUser } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CajaPage from '@/pages/CajaPage';
import DashboardPage from '@/pages/DashboardPage';
import ClientesPage from '@/pages/clientes/ClientesPage';
import ProveedoresPage from '@/pages/proveedores/ProveedoresPage';
import OrdenesCompraPage from '@/pages/ordenes-compra/OrdenesCompraPage';
import CRMPage from '@/pages/CRMPage';
import ComercialPage from '@/pages/ComercialPage';
import UsuariosPage from '@/modules/usuarios/pages/UsuariosPage';
import ReportesPage from '@/modules/reportes/pages/ReportesPage';
import PosLayout from '@/layouts/PosLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

type AppRouterProps = {
  user: AuthUser | null;
  sedeId: string;
  redirectPath: string;
  logout: () => void;
  navigateToLogin: () => void;
  navigateToPos: () => void;
};

export default function AppRouter({
  user,
  sedeId,
  redirectPath,
  logout,
  navigateToLogin,
  navigateToPos,
}: AppRouterProps) {
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
                  navigateToLogin();
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
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/comercial" element={<ComercialPage />} />
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
            <Route path="/usuarios" element={<UsuariosPage onBackToPos={navigateToPos} />} />
          </Route>

          <Route
            element={
              <ProtectedRoute requiredPermisos={[Permiso.REPORTES_VER]} redirectTo={redirectPath} />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
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
