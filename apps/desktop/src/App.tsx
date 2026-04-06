import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Rol } from '@cosmeticos/shared-types';
import { useAuthStore, canAccessPath, getAllowedPathsByRole } from './store/auth.store';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SedesPage = lazy(() => import('./pages/SedesPage'));
const ProductosPage = lazy(() => import('./pages/ProductosPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const ClientesPage = lazy(() => import('./pages/ClientesPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const POSPage = lazy(() => import('./pages/POSPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const SyncPage = lazy(() => import('./pages/SyncPage'));
const ImportacionesPage = lazy(() => import('./pages/ImportacionesPage'));
const DiagnosticoPage = lazy(() => import('./pages/DiagnosticoPage'));
const ConfiguracionesPage = lazy(() => import('./pages/ConfiguracionesPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const ProveedoresPage = lazy(() => import('./pages/ProveedoresPage'));
const OrdenesCompraPage = lazy(() => import('./pages/OrdenesCompraPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const ComercialPage = lazy(() => import('./pages/ComercialPage'));
const FinanzasPage = lazy(() => import('./pages/FinanzasPage'));
const RRHHPage = lazy(() => import('./pages/RRHHPage'));
const ActivosPage = lazy(() => import('./pages/ActivosPage'));
const ProyectosPage = lazy(() => import('./pages/ProyectosPage'));
const DocumentosPage = lazy(() => import('./pages/DocumentosPage'));
const InmobiliariaPage = lazy(() => import('./pages/InmobiliariaPage'));
const InversionistasPage = lazy(() => import('./pages/InversionistasPage'));
const SuperadminPage = lazy(() => import('./pages/SuperadminPage'));
const isDev = import.meta.env.DEV;

function RouteLoader() {
  return (
    <div
      className="min-h-screen grid place-items-center"
      style={{ backgroundColor: '#F3EFF1', color: '#735946' }}
    >
      <div className="text-sm font-bold uppercase tracking-widest animate-pulse">
        Cargando módulo...
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  path,
  allowedRoles,
}: {
  children: React.ReactNode;
  path: string;
  allowedRoles?: Rol[];
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const usuario = useAuthStore((state) => state.usuario);

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol === Rol.SUPERADMIN) {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    const firstAllowedPath = getAllowedPathsByRole(usuario.rol)[0] ?? '/login';
    return <Navigate to={firstAllowedPath} replace />;
  }

  if (!canAccessPath(usuario.rol, path)) {
    const firstAllowedPath = getAllowedPathsByRole(usuario.rol)[0] ?? '/login';
    return <Navigate to={firstAllowedPath} replace />;
  }

  return <>{children}</>;
}

function DefaultRedirect() {
  const usuario = useAuthStore((state) => state.usuario);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
  }

  const defaultPath = getAllowedPathsByRole(usuario.rol)[0] ?? '/login';
  return <Navigate to={defaultPath} replace />;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DefaultRedirect />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute path="/dashboard" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sedes"
            element={
              <ProtectedRoute path="/sedes" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <SedesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <ProtectedRoute path="/productos">
                <ProductosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute path="/inventario">
                <InventarioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute path="/clientes">
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm"
            element={
              <ProtectedRoute path="/crm">
                <CRMPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comercial"
            element={
              <ProtectedRoute path="/comercial">
                <ComercialPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finanzas"
            element={
              <ProtectedRoute path="/finanzas">
                <FinanzasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rrhh"
            element={
              <ProtectedRoute path="/rrhh" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <RRHHPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activos"
            element={
              <ProtectedRoute path="/activos" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <ActivosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos"
            element={
              <ProtectedRoute path="/proyectos" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <ProyectosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentos"
            element={
              <ProtectedRoute path="/documentos" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <DocumentosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inmobiliaria"
            element={
              <ProtectedRoute path="/inmobiliaria" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <InmobiliariaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversionistas"
            element={
              <ProtectedRoute path="/inversionistas" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <InversionistasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute path="/superadmin" allowedRoles={[Rol.SUPERADMIN]}>
                <SuperadminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caja"
            element={
              <ProtectedRoute path="/caja">
                <CajaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute path="/pos">
                <POSPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute path="/reportes" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <ReportesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sync"
            element={
              <ProtectedRoute path="/sync" allowedRoles={[Rol.ADMIN]}>
                <SyncPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/importaciones"
            element={
              <ProtectedRoute path="/importaciones" allowedRoles={[Rol.ADMIN]}>
                <ImportacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuraciones"
            element={
              <ProtectedRoute path="/configuraciones" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <ConfiguracionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute path="/usuarios" allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR]}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute
                path="/proveedores"
                allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO]}
              >
                <ProveedoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordenes-compra"
            element={
              <ProtectedRoute
                path="/ordenes-compra"
                allowedRoles={[Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO]}
              >
                <OrdenesCompraPage />
              </ProtectedRoute>
            }
          />
          {isDev && (
            <Route
              path="/diagnostico"
              element={
                <ProtectedRoute path="/diagnostico" allowedRoles={[Rol.ADMIN]}>
                  <DiagnosticoPage />
                </ProtectedRoute>
              }
            />
          )}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
