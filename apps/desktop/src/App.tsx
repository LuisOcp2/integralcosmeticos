import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Rol } from '@cosmeticos/shared-types';
import { useAuthStore } from './store/auth.store';
import { canAccessPath, getAllowedPathsByRole } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SedesPage from './pages/SedesPage';
import ProductosPage from './pages/ProductosPage';
import InventarioPage from './pages/InventarioPage';
import ClientesPage from './pages/ClientesPage';
import CajaPage from './pages/CajaPage';
import POSPage from './pages/POSPage';
import ReportesPage from './pages/ReportesPage';
import SyncPage from './pages/SyncPage';

function ProtectedRoute({
  children,
  path,
  allowedRoles,
}: {
  children: React.ReactNode;
  path: string;
  allowedRoles?: Rol[];
}) {
  const { isAuthenticated, usuario } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    usuario: state.usuario,
  }));

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
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

export default function App() {
  const usuario = useAuthStore((state) => state.usuario);
  const defaultPath = usuario ? (getAllowedPathsByRole(usuario.rol)[0] ?? '/login') : '/login';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute path={defaultPath}>
              <Navigate to={defaultPath} replace />
            </ProtectedRoute>
          }
        />
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
          path="/sincronizacion"
          element={
            <ProtectedRoute path="/sync" allowedRoles={[Rol.ADMIN]}>
              <Navigate to="/sync" replace />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
