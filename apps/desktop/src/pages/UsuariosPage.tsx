import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permiso, PERMISOS_POR_ROL, Rol } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

// ─── Types ───────────────────────────────────────────────────────────────────

// Re-export for local convenience; Rol comes from @cosmeticos/shared-types
type RolUsuario = Rol;

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
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
};

type PaginatedUsuarios = {
  data: Usuario[];
  total: number;
  page: number;
  totalPages: number;
};

type FiltrosUsuario = {
  buscar?: string;
  rol?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
};

type Sede = { id: string; nombre: string };

type AuthUser = {
  id: string;
  rol: RolUsuario;
  permisosExtra?: string[];
  permisosRevocados?: string[];
};

type SesionEntry = {
  id: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES: Rol[] = [Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO];

const formatDate = (value: string | null) => {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('es-CO');
};

const normalizeError = (e: any, fallback: string) => {
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string') return msg;
  return fallback;
};

/** Trim + lowercase an email string */
const sanitizeEmail = (v: string) => v.trim().toLowerCase();

// ─── Password strength hook ───────────────────────────────────────────────────

type PasswordStrength = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isStrong: boolean;
};

function usePasswordStrength(password: string): PasswordStrength {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#+\-_]/.test(password);
  const isStrong = minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  return { minLength, hasUppercase, hasLowercase, hasNumber, hasSpecial, isStrong };
}

function PasswordHints({ password, show }: { password: string; show: boolean }) {
  const s = usePasswordStrength(password);
  if (!show || !password) return null;
  const hint = (ok: boolean, label: string) => (
    <span className={`text-xs ${ok ? 'text-green-600' : 'text-[#b14040]'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {hint(s.minLength, 'Mín 8 caracteres')}
      {hint(s.hasUppercase, 'Mayúscula')}
      {hint(s.hasLowercase, 'Minúscula')}
      {hint(s.hasNumber, 'Número')}
      {hint(s.hasSpecial, 'Carácter especial')}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosUsuario>({ page: 1, limit: 20, activo: true });
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPermisos, setShowPermisos] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showPerfil, setShowPerfil] = useState(false);
  const [showCambiarRol, setShowCambiarRol] = useState(false);
  const [showSesiones, setShowSesiones] = useState(false);

  const [crearForm, setCrearForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: Rol.CAJERO,
    sedeId: '',
    telefono: '',
    notas: '',
    forzarCambioPassword: false,
  });

  const [editarForm, setEditarForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rol: Rol.CAJERO,
    sedeId: '',
    telefono: '',
    notas: '',
    activo: true,
    forzarCambioPassword: false,
  });

  const [resetForm, setResetForm] = useState({ passwordNuevo: '', forzarCambio: true, motivo: '' });
  const [perfilForm, setPerfilForm] = useState({ passwordActual: '', passwordNuevo: '' });
  const [cambiarRolForm, setCambiarRolForm] = useState({ rol: Rol.CAJERO, motivo: '' });

  // ── Queries ────────────────────────────────────────────────────────────────

  const meQuery = useQuery({
    queryKey: ['usuarios', 'me'],
    queryFn: async () => {
      const { data } = await api.get<AuthUser>('/usuarios/me');
      return data;
    },
  });

  const sedesQuery = useQuery({
    queryKey: ['usuarios', 'sedes'],
    queryFn: async () => {
      const { data } = await api.get<Sede[]>('/sedes');
      return data;
    },
  });

  const usuariosQuery = useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: async () => {
      const { data } = await api.get<PaginatedUsuarios>('/usuarios', { params: filtros });
      return data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['usuarios', 'estadisticas'],
    queryFn: async () => {
      const { data } = await api.get<{
        total: number;
        activos: number;
        inactivos: number;
        bloqueados: number;
      }>('/usuarios/estadisticas');
      return data;
    },
  });

  const auditoriaQuery = useQuery({
    queryKey: ['usuarios', 'auditoria', selected?.id],
    queryFn: async () => {
      if (!selected) return { data: [], total: 0 } as { data: any[]; total: number };
      const { data } = await api.get<{ data: any[]; total: number }>(
        `/usuarios/${selected.id}/auditoria`,
      );
      return data;
    },
    enabled: Boolean(selected && showPermisos),
  });

  const sesionesQuery = useQuery({
    queryKey: ['usuarios', 'me', 'sesiones'],
    queryFn: async () => {
      const { data } = await api.get<SesionEntry[]>('/usuarios/me/sesiones');
      return data;
    },
    enabled: showSesiones,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: crearForm.nombre.trim(),
        apellido: crearForm.apellido.trim(),
        email: sanitizeEmail(crearForm.email),
        password: crearForm.password,
        rol: crearForm.rol,
        sedeId: crearForm.sedeId || null,
        telefono: crearForm.telefono || undefined,
        notas: crearForm.notas || undefined,
        forzarCambioPassword: crearForm.forzarCambioPassword,
      };
      await api.post('/usuarios', payload);
    },
    onSuccess: async () => {
      setShowCreate(false);
      setCrearForm({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: Rol.CAJERO,
        sedeId: '',
        telefono: '',
        notas: '',
        forzarCambioPassword: false,
      });
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.patch(`/usuarios/${selected.id}`, {
        nombre: editarForm.nombre.trim(),
        apellido: editarForm.apellido.trim(),
        email: sanitizeEmail(editarForm.email),
        rol: editarForm.rol,
        sedeId: editarForm.sedeId || null,
        telefono: editarForm.telefono || null,
        notas: editarForm.notas || null,
        activo: editarForm.activo,
        forzarCambioPassword: editarForm.forzarCambioPassword,
      });
    },
    onSuccess: async () => {
      setShowEdit(false);
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/usuarios/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const activarMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/usuarios/${id}/activar`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const bloquearMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/usuarios/${id}/bloquear`, { minutos: 30 });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const desbloquearMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/usuarios/${id}/desbloquear`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post(`/usuarios/${selected.id}/reset-password`, resetForm);
    },
    onSuccess: async () => {
      setShowReset(false);
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const permisosMutation = useMutation({
    mutationFn: async (payload: {
      permisosExtra: string[];
      permisosRevocados: string[];
      motivo?: string;
    }) => {
      if (!selected) return;
      await api.put(`/usuarios/${selected.id}/permisos`, payload);
    },
    onSuccess: async () => {
      setShowPermisos(false);
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const cambiarPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!meQuery.data?.id) return;
      await api.patch(`/usuarios/${meQuery.data.id}/cambiar-password`, perfilForm);
    },
    onSuccess: () => {
      setShowPerfil(false);
      setPerfilForm({ passwordActual: '', passwordNuevo: '' });
    },
  });

  /** Calls the new PATCH /usuarios/:id/rol endpoint */
  const cambiarRolMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.patch(`/usuarios/${selected.id}/rol`, {
        rol: cambiarRolForm.rol,
        motivo: cambiarRolForm.motivo || undefined,
      });
    },
    onSuccess: async () => {
      setShowCambiarRol(false);
      setCambiarRolForm({ rol: Rol.CAJERO, motivo: '' });
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const effectivePermisos = useMemo(() => {
    const me = meQuery.data;
    if (!me) return new Set<string>();
    const base = PERMISOS_POR_ROL[me.rol] ?? [];
    const extra = me.permisosExtra ?? [];
    const revoked = new Set(me.permisosRevocados ?? []);
    return new Set([...base, ...extra].filter((p) => !revoked.has(p)));
  }, [meQuery.data]);

  const can = (permiso: Permiso) => effectivePermisos.has(permiso);

  const usuarios = usuariosQuery.data?.data ?? [];
  const stats = statsQuery.data;
  const sedesById = useMemo(
    () => new Map((sedesQuery.data ?? []).map((s) => [s.id, s.nombre])),
    [sedesQuery.data],
  );
  const getSedeLabel = (sedeId: string | null) => {
    if (!sedeId) return 'Sin sede';
    return sedesById.get(sedeId) ?? 'Sede no disponible';
  };

  // Password strength for forms
  const crearPasswordStrength = usePasswordStrength(crearForm.password);
  const resetPasswordStrength = usePasswordStrength(resetForm.passwordNuevo);
  const perfilPasswordStrength = usePasswordStrength(perfilForm.passwordNuevo);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-3xl border border-[#ead8dc] bg-white p-6">
          <h1 className="text-3xl font-black text-[#3d2a2d]">Usuarios, Roles y Permisos</h1>
          <p className="mt-1 text-sm text-[#6f5a60]">
            Modulo completo para crear, editar, bloquear, activar, resetear password y gestionar
            permisos.
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            className="rounded-xl bg-[#2e1b0c] px-4 py-3 text-left text-sm font-bold text-white disabled:opacity-50"
            disabled={!can(Permiso.USUARIOS_CREAR)}
            onClick={() => setShowCreate(true)}
          >
            Crear usuario
          </button>
          <button
            className="rounded-xl border border-[#d8c4ca] bg-white px-4 py-3 text-left text-sm font-bold"
            onClick={() => setShowPerfil(true)}
          >
            Mi perfil
          </button>
          <button
            className="rounded-xl border border-[#d8c4ca] bg-white px-4 py-3 text-left text-sm font-bold"
            onClick={() => setShowSesiones(true)}
          >
            Mis sesiones
          </button>
          <button
            className="rounded-xl border border-[#d8c4ca] bg-white px-4 py-3 text-left text-sm font-bold"
            onClick={() => usuariosQuery.refetch()}
          >
            Actualizar tabla
          </button>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#ead8dc] bg-white p-4">
              <p className="text-xs text-[#7c6870]">Total</p>
              <p className="text-2xl font-black text-[#3d2a2d]">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-[#ead8dc] bg-white p-4">
              <p className="text-xs text-[#7c6870]">Activos</p>
              <p className="text-2xl font-black text-[#3d2a2d]">{stats.activos}</p>
            </div>
            <div className="rounded-xl border border-[#ead8dc] bg-white p-4">
              <p className="text-xs text-[#7c6870]">Inactivos</p>
              <p className="text-2xl font-black text-[#3d2a2d]">{stats.inactivos}</p>
            </div>
            <div className="rounded-xl border border-[#ead8dc] bg-white p-4">
              <p className="text-xs text-[#7c6870]">Bloqueados</p>
              <p className="text-2xl font-black text-[#3d2a2d]">{stats.bloqueados}</p>
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="rounded-2xl border border-[#ead8dc] bg-white p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <input
              className="rounded-xl border border-[#d8c4ca] px-3 py-2 text-sm"
              placeholder="Buscar por nombre, apellido, email"
              value={filtros.buscar ?? ''}
              onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value, page: 1 }))}
            />
            <select
              className="rounded-xl border border-[#d8c4ca] px-3 py-2 text-sm"
              value={filtros.rol ?? ''}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, rol: e.target.value || undefined, page: 1 }))
              }
            >
              <option value="">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-[#d8c4ca] px-3 py-2 text-sm"
              value={String(filtros.activo ?? true)}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, activo: e.target.value === 'true', page: 1 }))
              }
            >
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#ead8dc] bg-white">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-[#f8f3f5] text-left text-[#6f5a60]">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ultimo login</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-5" colSpan={6}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td className="px-4 py-5" colSpan={6}>
                    Sin resultados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const bloqueado = Boolean(
                    u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date(),
                  );
                  return (
                    <tr key={u.id} className="border-t border-[#f0e4e8]">
                      <td className="px-4 py-3">
                        <button
                          className="font-semibold text-[#3d2a2d] underline-offset-2 hover:underline"
                          onClick={() => {
                            setSelected(u);
                            setShowPermisos(true);
                          }}
                        >
                          {u.nombre} {u.apellido}
                        </button>
                        <p className="text-xs text-[#7b676f]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f2e9ec] px-2 py-0.5 text-xs font-bold text-[#5c4950]">
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f2e9ec] px-3 py-1 text-xs font-bold text-[#5c4950]">
                          {bloqueado ? 'Bloqueado' : u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(u.ultimoLogin)}</td>
                      <td className="px-4 py-3">{getSedeLabel(u.sedeId)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(Permiso.USUARIOS_EDITAR) ? (
                            <button
                              className="rounded-lg bg-[#f1e7ea] px-2 py-1 text-xs font-semibold"
                              onClick={() => {
                                setSelected(u);
                                setEditarForm({
                                  nombre: u.nombre,
                                  apellido: u.apellido,
                                  email: u.email,
                                  rol: u.rol,
                                  sedeId: u.sedeId ?? '',
                                  telefono: u.telefono ?? '',
                                  notas: u.notas ?? '',
                                  activo: u.activo,
                                  forzarCambioPassword: u.forzarCambioPassword,
                                });
                                setShowEdit(true);
                              }}
                            >
                              Editar
                            </button>
                          ) : null}

                          {can(Permiso.USUARIOS_CAMBIAR_ROL) ? (
                            <button
                              className="rounded-lg bg-[#e8f0fe] px-2 py-1 text-xs font-semibold text-[#1a56a0]"
                              onClick={() => {
                                setSelected(u);
                                setCambiarRolForm({ rol: u.rol, motivo: '' });
                                setShowCambiarRol(true);
                              }}
                            >
                              Cambiar rol
                            </button>
                          ) : null}

                          {can(Permiso.USUARIOS_CAMBIAR_ROL) ? (
                            <button
                              className="rounded-lg bg-[#f1e7ea] px-2 py-1 text-xs font-semibold"
                              onClick={() => {
                                setSelected(u);
                                setShowPermisos(true);
                              }}
                            >
                              Permisos
                            </button>
                          ) : null}

                          {can(Permiso.USUARIOS_RESET_PASSWORD) ? (
                            <button
                              className="rounded-lg bg-[#f1e7ea] px-2 py-1 text-xs font-semibold"
                              onClick={() => {
                                setSelected(u);
                                setShowReset(true);
                              }}
                            >
                              Reset pass
                            </button>
                          ) : null}

                          {can(Permiso.USUARIOS_EDITAR) ? (
                            bloqueado ? (
                              <button
                                className="rounded-lg bg-[#f1e7ea] px-2 py-1 text-xs font-semibold"
                                onClick={() => desbloquearMutation.mutate(u.id)}
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button
                                className="rounded-lg bg-[#f1e7ea] px-2 py-1 text-xs font-semibold"
                                onClick={() => bloquearMutation.mutate(u.id)}
                              >
                                Bloquear
                              </button>
                            )
                          ) : null}

                          {can(Permiso.USUARIOS_ELIMINAR) ? (
                            u.activo ? (
                              <button
                                className="rounded-lg bg-[#ffe9e9] px-2 py-1 text-xs font-semibold text-[#a22]"
                                onClick={() => removeMutation.mutate(u.id)}
                              >
                                Desactivar
                              </button>
                            ) : (
                              <button
                                className="rounded-lg bg-[#e9faee] px-2 py-1 text-xs font-semibold text-[#1f7a35]"
                                onClick={() => activarMutation.mutate(u.id)}
                              >
                                Activar
                              </button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#f0e4e8] px-4 py-3 text-sm">
            <span>Total: {usuariosQuery.data?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#d8c4ca] px-3 py-1.5 disabled:opacity-50"
                onClick={() => setFiltros((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                disabled={(usuariosQuery.data?.page ?? 1) <= 1}
              >
                Anterior
              </button>
              <span>
                {usuariosQuery.data?.page ?? 1}/{usuariosQuery.data?.totalPages ?? 1}
              </span>
              <button
                className="rounded-lg border border-[#d8c4ca] px-3 py-1.5 disabled:opacity-50"
                onClick={() => setFiltros((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={(usuariosQuery.data?.page ?? 1) >= (usuariosQuery.data?.totalPages ?? 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal: Crear usuario ──────────────────────────────────────────── */}
        {showCreate ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-[#ead8dc] bg-white p-5">
              <h3 className="text-lg font-black text-[#3d2a2d]">Crear usuario</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  placeholder="Nombre"
                  value={crearForm.nombre}
                  onChange={(e) => setCrearForm((f) => ({ ...f, nombre: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  placeholder="Apellido"
                  value={crearForm.apellido}
                  onChange={(e) => setCrearForm((f) => ({ ...f, apellido: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2 md:col-span-2"
                  placeholder="Email"
                  type="email"
                  value={crearForm.email}
                  onChange={(e) => setCrearForm((f) => ({ ...f, email: e.target.value }))}
                  onBlur={(e) =>
                    setCrearForm((f) => ({ ...f, email: sanitizeEmail(e.target.value) }))
                  }
                />
                <div className="md:col-span-2">
                  <input
                    className="w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                    type="password"
                    placeholder="Contraseña"
                    value={crearForm.password}
                    onChange={(e) => setCrearForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <PasswordHints
                    password={crearForm.password}
                    show={crearForm.password.length > 0}
                  />
                </div>
                <select
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={crearForm.rol}
                  onChange={(e) =>
                    setCrearForm((f) => ({ ...f, rol: e.target.value as RolUsuario }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={crearForm.sedeId}
                  onChange={(e) => setCrearForm((f) => ({ ...f, sedeId: e.target.value }))}
                >
                  <option value="">Sin sede</option>
                  {(sedesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  placeholder="Teléfono"
                  value={crearForm.telefono}
                  onChange={(e) => setCrearForm((f) => ({ ...f, telefono: e.target.value }))}
                />
                <textarea
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2 md:col-span-2"
                  placeholder="Notas"
                  value={crearForm.notas}
                  onChange={(e) => setCrearForm((f) => ({ ...f, notas: e.target.value }))}
                />
                <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={crearForm.forzarCambioPassword}
                    onChange={(e) =>
                      setCrearForm((f) => ({ ...f, forzarCambioPassword: e.target.checked }))
                    }
                  />
                  Forzar cambio de contraseña en primer login
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#d8c4ca] px-3 py-2"
                  onClick={() => setShowCreate(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#2e1b0c] px-3 py-2 font-bold text-white disabled:opacity-50"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !crearPasswordStrength.isStrong}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
              {!crearPasswordStrength.isStrong && crearForm.password.length > 0 ? (
                <p className="mt-1 text-xs text-[#8a5a00]">
                  La contraseña debe cumplir todos los requisitos.
                </p>
              ) : null}
              {createMutation.isError ? (
                <p className="mt-2 text-sm text-[#b12121]">
                  {normalizeError(createMutation.error, 'No se pudo crear usuario')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Modal: Editar usuario ─────────────────────────────────────────── */}
        {showEdit && selected ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-[#ead8dc] bg-white p-5">
              <h3 className="text-lg font-black text-[#3d2a2d]">Editar usuario</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={editarForm.nombre}
                  onChange={(e) => setEditarForm((f) => ({ ...f, nombre: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={editarForm.apellido}
                  onChange={(e) => setEditarForm((f) => ({ ...f, apellido: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2 md:col-span-2"
                  type="email"
                  value={editarForm.email}
                  onChange={(e) => setEditarForm((f) => ({ ...f, email: e.target.value }))}
                  onBlur={(e) =>
                    setEditarForm((f) => ({ ...f, email: sanitizeEmail(e.target.value) }))
                  }
                />
                <select
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={editarForm.rol}
                  onChange={(e) =>
                    setEditarForm((f) => ({ ...f, rol: e.target.value as RolUsuario }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={editarForm.sedeId}
                  onChange={(e) => setEditarForm((f) => ({ ...f, sedeId: e.target.value }))}
                >
                  <option value="">Sin sede</option>
                  {(sedesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={editarForm.telefono}
                  onChange={(e) => setEditarForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="Teléfono"
                />
                <textarea
                  className="rounded-xl border border-[#d8c4ca] px-3 py-2 md:col-span-2"
                  value={editarForm.notas}
                  onChange={(e) => setEditarForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas"
                />
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editarForm.activo}
                    onChange={(e) => setEditarForm((f) => ({ ...f, activo: e.target.checked }))}
                  />
                  Usuario activo
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editarForm.forzarCambioPassword}
                    onChange={(e) =>
                      setEditarForm((f) => ({ ...f, forzarCambioPassword: e.target.checked }))
                    }
                  />
                  Forzar cambio de contraseña
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#d8c4ca] px-3 py-2"
                  onClick={() => setShowEdit(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#2e1b0c] px-3 py-2 font-bold text-white"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {updateMutation.isError ? (
                <p className="mt-2 text-sm text-[#b12121]">
                  {normalizeError(updateMutation.error, 'No se pudo actualizar')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Modal: Cambiar rol ────────────────────────────────────────────── */}
        {showCambiarRol && selected ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#ead8dc] bg-white p-5">
              <h3 className="text-lg font-black text-[#3d2a2d]">Cambiar rol</h3>
              <p className="mt-1 text-sm text-[#6f5a60]">
                {selected.nombre} {selected.apellido} — rol actual:{' '}
                <span className="font-bold">{selected.rol}</span>
              </p>
              <p className="mt-1 text-xs text-[#8a6a00]">
                ⚠ Cambiar el rol invalidará todos los tokens activos del usuario.
              </p>
              <div className="mt-3 space-y-2">
                <select
                  className="w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                  value={cambiarRolForm.rol}
                  onChange={(e) =>
                    setCambiarRolForm((f) => ({ ...f, rol: e.target.value as RolUsuario }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  className="w-full rounded-xl border border-[#d8c4ca] px-3 py-2 text-sm"
                  placeholder="Motivo del cambio (opcional)"
                  rows={2}
                  value={cambiarRolForm.motivo}
                  onChange={(e) => setCambiarRolForm((f) => ({ ...f, motivo: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#d8c4ca] px-3 py-2"
                  onClick={() => setShowCambiarRol(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#1a3a80] px-3 py-2 font-bold text-white disabled:opacity-50"
                  onClick={() => cambiarRolMutation.mutate()}
                  disabled={cambiarRolMutation.isPending || cambiarRolForm.rol === selected.rol}
                >
                  {cambiarRolMutation.isPending ? 'Cambiando...' : 'Confirmar cambio'}
                </button>
              </div>
              {cambiarRolMutation.isError ? (
                <p className="mt-2 text-sm text-[#b12121]">
                  {normalizeError(cambiarRolMutation.error, 'No se pudo cambiar el rol')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Modal: Reset password ─────────────────────────────────────────── */}
        {showReset && selected ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#ead8dc] bg-white p-5">
              <h3 className="text-lg font-black text-[#3d2a2d]">Resetear contraseña</h3>
              <p className="mt-1 text-sm text-[#6f5a60]">{selected.email}</p>
              <input
                className="mt-3 w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                type="password"
                placeholder="Nueva contraseña"
                value={resetForm.passwordNuevo}
                onChange={(e) => setResetForm((f) => ({ ...f, passwordNuevo: e.target.value }))}
              />
              <PasswordHints
                password={resetForm.passwordNuevo}
                show={resetForm.passwordNuevo.length > 0}
              />
              <textarea
                className="mt-2 w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                placeholder="Motivo"
                value={resetForm.motivo}
                onChange={(e) => setResetForm((f) => ({ ...f, motivo: e.target.value }))}
              />
              <label className="mt-2 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={resetForm.forzarCambio}
                  onChange={(e) => setResetForm((f) => ({ ...f, forzarCambio: e.target.checked }))}
                />
                Forzar cambio en siguiente login
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#d8c4ca] px-3 py-2"
                  onClick={() => setShowReset(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#2e1b0c] px-3 py-2 font-bold text-white disabled:opacity-50"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending || !resetPasswordStrength.isStrong}
                >
                  {resetMutation.isPending ? 'Procesando...' : 'Resetear'}
                </button>
              </div>
              {resetMutation.isError ? (
                <p className="mt-2 text-sm text-[#b12121]">
                  {normalizeError(resetMutation.error, 'No se pudo resetear')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Modal: Permisos y auditoría ───────────────────────────────────── */}
        {showPermisos && selected ? (
          <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
            <div className="mx-auto max-w-5xl rounded-2xl border border-[#ead8dc] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-[#3d2a2d]">Permisos y auditoría</h3>
                <button
                  className="rounded-lg border border-[#d8c4ca] px-3 py-1.5 text-sm"
                  onClick={() => setShowPermisos(false)}
                >
                  Cerrar
                </button>
              </div>

              <p className="mb-3 text-sm text-[#6f5a60]">
                Usuario: {selected.nombre} {selected.apellido} ({selected.email})
              </p>

              <div className="rounded-xl border border-[#ead8dc] p-3">
                <p className="mb-2 text-sm font-semibold text-[#5c4950]">Actualizar permisos</p>
                <button
                  className="rounded-lg bg-[#2e1b0c] px-3 py-2 text-sm font-bold text-white"
                  onClick={() =>
                    permisosMutation.mutate({
                      permisosExtra: [],
                      permisosRevocados: [],
                      motivo: 'Reset permisos al rol base',
                    })
                  }
                  disabled={permisosMutation.isPending || !can(Permiso.USUARIOS_CAMBIAR_ROL)}
                >
                  Restaurar permisos base del rol
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#ead8dc] p-3">
                <p className="mb-2 text-sm font-semibold text-[#5c4950]">Auditoría reciente</p>
                {auditoriaQuery.isLoading ? (
                  <p className="text-sm">Cargando auditoría...</p>
                ) : (auditoriaQuery.data?.data ?? []).length === 0 ? (
                  <p className="text-sm">No hay eventos de auditoría.</p>
                ) : (
                  <div className="space-y-2">
                    {(auditoriaQuery.data?.data ?? []).map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-[#f0e4e8] p-2">
                        <p className="text-sm font-semibold">{ev.accion}</p>
                        <p className="text-xs text-[#7b676f]">{formatDate(ev.createdAt)}</p>
                        {ev.motivo ? <p className="text-xs">{ev.motivo}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Modal: Mi perfil / Cambiar contraseña ────────────────────────── */}
        {showPerfil ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#ead8dc] bg-white p-5">
              <h3 className="text-lg font-black text-[#3d2a2d]">Mi perfil — Cambiar contraseña</h3>
              <input
                className="mt-3 w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                type="password"
                placeholder="Contraseña actual"
                value={perfilForm.passwordActual}
                onChange={(e) => setPerfilForm((f) => ({ ...f, passwordActual: e.target.value }))}
              />
              <div className="mt-2">
                <input
                  className="w-full rounded-xl border border-[#d8c4ca] px-3 py-2"
                  type="password"
                  placeholder="Contraseña nueva"
                  value={perfilForm.passwordNuevo}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, passwordNuevo: e.target.value }))}
                />
                <PasswordHints
                  password={perfilForm.passwordNuevo}
                  show={perfilForm.passwordNuevo.length > 0}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#d8c4ca] px-3 py-2"
                  onClick={() => setShowPerfil(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#2e1b0c] px-3 py-2 font-bold text-white disabled:opacity-50"
                  onClick={() => cambiarPasswordMutation.mutate()}
                  disabled={cambiarPasswordMutation.isPending || !perfilPasswordStrength.isStrong}
                >
                  {cambiarPasswordMutation.isPending ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
              {cambiarPasswordMutation.isError ? (
                <p className="mt-2 text-sm text-[#b12121]">
                  {normalizeError(cambiarPasswordMutation.error, 'No se pudo cambiar contraseña')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── Modal: Mis sesiones ───────────────────────────────────────────── */}
        {showSesiones ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#ead8dc] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-[#3d2a2d]">Mis últimas sesiones</h3>
                <button
                  className="rounded-lg border border-[#d8c4ca] px-3 py-1.5 text-sm"
                  onClick={() => setShowSesiones(false)}
                >
                  Cerrar
                </button>
              </div>
              {sesionesQuery.isLoading ? (
                <p className="text-sm">Cargando sesiones...</p>
              ) : sesionesQuery.isError ? (
                <p className="text-sm text-[#b12121]">
                  No se pudieron cargar las sesiones. El endpoint puede no estar disponible aún.
                </p>
              ) : (sesionesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-[#6f5a60]">No hay sesiones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {(sesionesQuery.data ?? []).map((s) => (
                    <div key={s.id} className="rounded-xl border border-[#f0e4e8] p-3">
                      <p className="text-sm font-semibold">{formatDate(s.createdAt)}</p>
                      {s.ip ? <p className="text-xs text-[#7b676f]">IP: {s.ip}</p> : null}
                      {s.userAgent ? (
                        <p className="truncate text-xs text-[#7b676f]">{s.userAgent}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
