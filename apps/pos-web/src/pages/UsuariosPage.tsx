import { useMemo, useState } from 'react';
import { Search, UserPlus, UserX, UserCheck } from 'lucide-react';
import { useSedes } from '@/hooks/useSedes';
import { useUsuarios, useToggleUsuarioEstado, useCreateUsuarioAdmin } from '@/hooks/useUsuarios';

interface UsuariosPageProps {
  onBackToPos: () => void;
}

export default function UsuariosPage({ onBackToPos }: UsuariosPageProps) {
  const [q, setQ] = useState('');
  const [rol, setRol] = useState('');
  const [activo, setActivo] = useState<'activos' | 'inactivos' | 'todos'>('activos');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rol: 'CAJERO',
    sedeId: '',
    telefono: '',
    temporaryPassword: '',
  });

  const params = useMemo(() => {
    const built: Record<string, string | number | boolean> = { page, limit };
    if (q.trim()) built.q = q.trim();
    if (rol) built.rol = rol;
    if (activo !== 'todos') built.activo = activo === 'activos';
    return built;
  }, [q, rol, activo, page, limit]);

  const usuariosQuery = useUsuarios(params);
  const sedesQuery = useSedes();
  const toggleEstado = useToggleUsuarioEstado();
  const createUsuario = useCreateUsuarioAdmin();

  const usuarios = usuariosQuery.data?.data ?? [];
  const meta = usuariosQuery.data?.meta;

  return (
    <div className="h-screen w-screen bg-background flex">
      <div className="flex-1 p-6 overflow-auto">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">Usuarios y permisos</h1>
            <p className="text-sm text-on-surface-variant">Gestion administrativa de accesos</p>
          </div>
          <button onClick={onBackToPos} className="px-4 py-2 rounded-xl bg-surface-3 text-sm">
            Volver
          </button>
        </header>

        <section className="bg-surface border border-outline-variant rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
            <div className="flex items-center gap-2 border border-outline-variant rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-outline" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar usuario"
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <select
              value={rol}
              onChange={(e) => {
                setRol(e.target.value);
                setPage(1);
              }}
              className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface"
            >
              <option value="">Todos</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="CAJERO">CAJERO</option>
              <option value="BODEGUERO">BODEGUERO</option>
            </select>
            <select
              value={activo}
              onChange={(e) => {
                setActivo(e.target.value as typeof activo);
                setPage(1);
              }}
              className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface"
            >
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-primary text-on-primary text-sm font-semibold"
            >
              <UserPlus className="w-4 h-4" /> Nuevo
            </button>
          </div>
        </section>

        <section className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.rol}</td>
                  <td className="px-4 py-3">{u.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleEstado.mutate({ id: u.id, activo: !u.activo })}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-surface-3"
                    >
                      {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && !usuariosQuery.isLoading && (
                <tr>
                  <td className="px-4 py-4 text-on-surface-variant" colSpan={5}>
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center px-4 py-3 border-t border-outline-variant text-sm">
            <span>Total: {meta?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface-3 disabled:opacity-50"
              >
                Anterior
              </button>
              <span>
                {meta?.page ?? 1}/{meta?.totalPages ?? 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={Boolean(meta && page >= meta.totalPages)}
                className="px-3 py-1.5 rounded-lg bg-surface-3 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-surface p-5 border border-outline-variant">
            <h3 className="text-lg font-bold mb-3">Crear usuario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-xl border border-outline-variant px-3 py-2"
              />
              <input
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                placeholder="Apellido"
                className="rounded-xl border border-outline-variant px-3 py-2"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="rounded-xl border border-outline-variant px-3 py-2 md:col-span-2"
              />
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                className="rounded-xl border border-outline-variant px-3 py-2"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="CAJERO">CAJERO</option>
                <option value="BODEGUERO">BODEGUERO</option>
              </select>
              <select
                value={form.sedeId}
                onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
                className="rounded-xl border border-outline-variant px-3 py-2"
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
                placeholder="Telefono"
                className="rounded-xl border border-outline-variant px-3 py-2"
              />
              <input
                value={form.temporaryPassword}
                onChange={(e) => setForm((f) => ({ ...f, temporaryPassword: e.target.value }))}
                placeholder="Contrasena temporal"
                className="rounded-xl border border-outline-variant px-3 py-2"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl px-3 py-2 bg-surface-3"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  createUsuario.mutate(
                    {
                      nombre: form.nombre.trim(),
                      apellido: form.apellido.trim(),
                      email: form.email.trim(),
                      rol: form.rol,
                      sedeId: form.sedeId || undefined,
                      telefono: form.telefono || undefined,
                      temporaryPassword: form.temporaryPassword || undefined,
                    },
                    {
                      onSuccess: () => {
                        setShowCreate(false);
                        setForm({
                          nombre: '',
                          apellido: '',
                          email: '',
                          rol: 'CAJERO',
                          sedeId: '',
                          telefono: '',
                          temporaryPassword: '',
                        });
                      },
                    },
                  );
                }}
                className="flex-1 rounded-xl px-3 py-2 bg-primary text-on-primary"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
