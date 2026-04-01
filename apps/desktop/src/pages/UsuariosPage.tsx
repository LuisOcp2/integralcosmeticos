import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { Rol } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  sedeId?: string | null;
  activo: boolean;
  telefono?: string | null;
  createdAt: string;
};

type UsuariosResponse = {
  data: Usuario[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type Sede = { id: string; nombre: string };

type UsuarioForm = {
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  sedeId?: string;
  telefono?: string;
  temporaryPassword?: string;
};

const emptyForm: UsuarioForm = {
  nombre: '',
  apellido: '',
  email: '',
  rol: Rol.CAJERO,
  sedeId: '',
  telefono: '',
  temporaryPassword: '',
};

function extractError(error: any, fallback = 'No se pudo completar la operacion'): string {
  const backendMessage =
    error?.response?.data?.message && Array.isArray(error.response.data.message)
      ? error.response.data.message.join('. ')
      : error?.response?.data?.message;
  return backendMessage || error?.message || fallback;
}

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [rol, setRol] = useState<Rol | ''>('');
  const [activo, setActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const params = useMemo(() => {
    const built: Record<string, string | number | boolean> = { page, limit };
    if (q.trim()) built.q = q.trim();
    if (rol) built.rol = rol;
    if (activo !== 'todos') built.activo = activo === 'activos';
    return built;
  }, [q, rol, activo, page, limit]);

  const usuariosQuery = useQuery({
    queryKey: ['usuarios', params],
    queryFn: async () => {
      const { data } = await api.get<UsuariosResponse>('/usuarios', { params });
      return data;
    },
  });

  const meQuery = useQuery({
    queryKey: ['usuarios', 'me'],
    queryFn: async () => {
      const { data } = await api.get<Usuario>('/usuarios/me');
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        rol: form.rol,
        sedeId: form.sedeId?.trim() || undefined,
        telefono: form.telefono?.trim() || undefined,
        temporaryPassword: form.temporaryPassword?.trim() || undefined,
      };
      return api.post('/usuarios/admin-create', payload);
    },
    onSuccess: async () => {
      setShowCreate(false);
      setForm(emptyForm);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const estadoMutation = useMutation({
    mutationFn: async ({ id, activo: status }: { id: string; activo: boolean }) => {
      await api.patch(`/usuarios/${id}/estado`, { activo: status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const usuarios = usuariosQuery.data?.data ?? [];
  const meta = usuariosQuery.data?.meta;

  return (
    <AppLayout>
      <div className="space-y-6">
        <header
          className="rounded-3xl p-6"
          style={{
            background: 'linear-gradient(125deg, #ffffff 0%, #f3eff1 52%, #f6f2f4 100%)',
            border: '1px solid rgba(218,192,197,0.45)',
          }}
        >
          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: tokens.color.textMuted }}
          >
            Seguridad y Accesos
          </p>
          <h1
            className="mt-1 text-3xl sm:text-4xl font-black"
            style={{ color: tokens.color.textStrong }}
          >
            Usuarios y Permisos
          </h1>
          <p className="mt-2 text-sm" style={{ color: tokens.color.textSoft }}>
            Gestion centralizada de usuarios, roles y activacion por sede.
          </p>
          {meQuery.data && (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: '#fff' }}
            >
              <Shield size={16} style={{ color: tokens.color.primary }} />
              <span className="text-sm font-semibold" style={{ color: tokens.color.textStrong }}>
                Sesion: {meQuery.data.nombre} {meQuery.data.apellido} ({meQuery.data.rol})
              </span>
            </div>
          )}
        </header>

        <section
          className="rounded-2xl p-4"
          style={{ backgroundColor: '#fff', border: '1px solid rgba(218,192,197,0.35)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 border"
              style={{ borderColor: tokens.color.border }}
            >
              <Search size={16} style={{ color: tokens.color.textMuted }} />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre, apellido o email"
                className="w-full text-sm outline-none"
              />
            </div>
            <select
              value={rol}
              onChange={(e) => {
                setRol((e.target.value as Rol) || '');
                setPage(1);
              }}
              className="rounded-xl px-3 py-2 border text-sm"
              style={{ borderColor: tokens.color.border }}
            >
              <option value="">Todos los roles</option>
              {Object.values(Rol).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              value={activo}
              onChange={(e) => {
                setActivo(e.target.value as typeof activo);
                setPage(1);
              }}
              className="rounded-xl px-3 py-2 border text-sm"
              style={{ borderColor: tokens.color.border }}
            >
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl px-3 py-2 border text-sm"
              style={{ borderColor: tokens.color.border }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white font-bold text-sm"
              style={{ backgroundColor: tokens.color.bgDark }}
            >
              <Plus size={16} /> Nuevo usuario
            </button>
          </div>
        </section>

        <section
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid rgba(218,192,197,0.35)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead style={{ backgroundColor: tokens.color.bgSoft }}>
                <tr>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3">Sede</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Creado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosQuery.isLoading && (
                  <tr>
                    <td className="px-4 py-5" colSpan={6}>
                      Cargando usuarios...
                    </td>
                  </tr>
                )}
                {!usuariosQuery.isLoading && usuarios.length === 0 && (
                  <tr>
                    <td className="px-4 py-5" colSpan={6}>
                      No hay resultados para los filtros aplicados.
                    </td>
                  </tr>
                )}
                {usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-t"
                    style={{ borderColor: tokens.color.borderSoft }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: tokens.color.textStrong }}>
                        {usuario.nombre} {usuario.apellido}
                      </p>
                      <p style={{ color: tokens.color.textMuted }}>{usuario.email}</p>
                    </td>
                    <td className="px-4 py-3">{usuario.rol}</td>
                    <td className="px-4 py-3">
                      {usuario.sedeId ? usuario.sedeId.slice(0, 8) : 'Sin sede'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                        style={{
                          backgroundColor: usuario.activo
                            ? 'rgba(46,125,50,0.12)'
                            : 'rgba(186,26,26,0.12)',
                          color: usuario.activo ? tokens.color.success : tokens.color.danger,
                        }}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(usuario.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold"
                        style={{
                          backgroundColor: usuario.activo
                            ? 'rgba(186,26,26,0.12)'
                            : 'rgba(46,125,50,0.12)',
                          color: usuario.activo ? tokens.color.danger : tokens.color.success,
                        }}
                        onClick={() =>
                          estadoMutation.mutate({ id: usuario.id, activo: !usuario.activo })
                        }
                        disabled={estadoMutation.isPending}
                      >
                        {usuario.activo ? <UserX size={14} /> : <UserCheck size={14} />}
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: tokens.color.borderSoft }}
          >
            <span className="text-sm" style={{ color: tokens.color.textMuted }}>
              Total: {meta?.total ?? 0}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                style={{ borderColor: tokens.color.border }}
              >
                Anterior
              </button>
              <span className="text-sm" style={{ color: tokens.color.textMuted }}>
                Pagina {meta?.page ?? 1} de {meta?.totalPages ?? 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={Boolean(meta && page >= meta.totalPages)}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                style={{ borderColor: tokens.color.border }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>

        {showCreate && (
          <div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            style={{ background: 'rgba(46,27,12,0.5)' }}
          >
            <div
              className="w-full max-w-2xl rounded-2xl overflow-hidden"
              style={{ backgroundColor: tokens.color.bgCard }}
            >
              <div className="px-6 py-5" style={{ backgroundColor: tokens.color.bgDark }}>
                <h3 className="text-xl font-black text-white">Crear usuario</h3>
                <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
                  Alta de usuario con contrasena temporal opcional.
                </p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                />
                <input
                  value={form.apellido}
                  onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                  placeholder="Apellido"
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-xl px-3 py-2.5 border md:col-span-2"
                  style={{ borderColor: tokens.color.border }}
                />
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as Rol }))}
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                >
                  {Object.values(Rol).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  value={form.sedeId}
                  onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                >
                  <option value="">Sin sede</option>
                  {(sedesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <input
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="Telefono (opcional)"
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                />
                <input
                  value={form.temporaryPassword}
                  onChange={(e) => setForm((f) => ({ ...f, temporaryPassword: e.target.value }))}
                  placeholder="Contrasena temporal (opcional)"
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ borderColor: tokens.color.border }}
                />
                {formError && (
                  <p
                    className="md:col-span-2 text-sm font-semibold"
                    style={{ color: tokens.color.danger }}
                  >
                    {formError}
                  </p>
                )}
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setFormError(null);
                  }}
                  className="flex-1 py-3 rounded-xl border font-bold"
                  style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    createMutation.mutate(undefined, {
                      onError: (e) => setFormError(extractError(e)),
                    });
                  }}
                  disabled={createMutation.isPending}
                  className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-70"
                  style={{ backgroundColor: tokens.color.bgDark }}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
