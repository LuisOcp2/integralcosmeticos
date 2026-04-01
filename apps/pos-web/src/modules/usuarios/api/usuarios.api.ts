import { apiClient } from '@/lib/api';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'BODEGUERO';
  sedeId: string | null;
  activo: boolean;
  telefono: string | null;
  avatarUrl: string | null;
  ultimoLogin: string | null;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  forzarCambioPassword: boolean;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsuarios {
  data: Usuario[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PermisosUsuarioResponse {
  permisosEfectivos: string[];
  permisosRol: string[];
  permisosExtra: string[];
  permisosRevocados: string[];
}

export interface AuditoriaUsuario {
  id: string;
  accion: string;
  realizadoPorId: string | null;
  datosAnteriores: Record<string, unknown> | null;
  datosNuevos: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  motivo: string | null;
  createdAt: string;
}

export interface CreateUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Usuario['rol'];
  sedeId?: string;
  telefono?: string;
  notas?: string;
  forzarCambioPassword?: boolean;
}

export interface UpdateUsuarioInput {
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: Usuario['rol'];
  sedeId?: string | null;
  telefono?: string | null;
  avatarUrl?: string | null;
  activo?: boolean;
  notas?: string | null;
  forzarCambioPassword?: boolean;
}

export interface FiltrosUsuario {
  buscar?: string;
  rol?: string;
  sedeId?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export const usuariosApi = {
  getAll: (filtros?: FiltrosUsuario) =>
    apiClient.get<PaginatedUsuarios>('/usuarios', { params: filtros }).then((r) => r.data),

  getOne: (id: string) => apiClient.get<Usuario>(`/usuarios/${id}`).then((r) => r.data),

  create: (data: CreateUsuarioInput) =>
    apiClient.post<Usuario>('/usuarios', data).then((r) => r.data),

  update: (id: string, data: UpdateUsuarioInput) =>
    apiClient.patch<Usuario>(`/usuarios/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/usuarios/${id}`),

  activar: (id: string) => apiClient.patch(`/usuarios/${id}/activar`).then((r) => r.data),

  bloquear: (id: string, minutos: number = 30) =>
    apiClient.post(`/usuarios/${id}/bloquear`, { minutos }).then((r) => r.data),

  desbloquear: (id: string) => apiClient.post(`/usuarios/${id}/desbloquear`).then((r) => r.data),

  cambiarPassword: (id: string, data: { passwordActual: string; passwordNuevo: string }) =>
    apiClient.patch(`/usuarios/${id}/cambiar-password`, data).then((r) => r.data),

  resetPasswordAdmin: (
    id: string,
    data: { passwordNuevo: string; forzarCambio?: boolean; motivo?: string },
  ) => apiClient.post(`/usuarios/${id}/reset-password`, data).then((r) => r.data),

  getPermisos: (id: string) =>
    apiClient.get<PermisosUsuarioResponse>(`/usuarios/${id}/permisos`).then((r) => r.data),

  setPermisos: (
    id: string,
    data: { permisosExtra: string[]; permisosRevocados: string[]; motivo?: string },
  ) => apiClient.put(`/usuarios/${id}/permisos`, data).then((r) => r.data),

  getAuditoria: (id: string, page = 1, limit = 30) =>
    apiClient
      .get<{ data: AuditoriaUsuario[]; total: number }>(`/usuarios/${id}/auditoria`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  getEstadisticas: () => apiClient.get('/usuarios/estadisticas').then((r) => r.data),
};
