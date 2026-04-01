import { useState } from 'react';
import type { Usuario } from '../api/usuarios.api';
import { useActualizarUsuario } from '../hooks/useUsuarios';
import { useSedes } from '@/hooks/useSedes';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

export const ModalEditarUsuario = ({ usuario, onClose }: Props) => {
  const update = useActualizarUsuario(usuario.id);
  const { data: sedes = [] } = useSedes();
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
    sedeId: usuario.sedeId ?? '',
    telefono: usuario.telefono ?? '',
    notas: usuario.notas ?? '',
    forzarCambioPassword: usuario.forzarCambioPassword,
    activo: usuario.activo,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface p-5">
        <h3 className="text-lg font-bold">Editar usuario</h3>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-outline-variant px-3 py-2"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <input
            className="rounded-xl border border-outline-variant px-3 py-2"
            value={form.apellido}
            onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
          />
          <input
            className="rounded-xl border border-outline-variant px-3 py-2 md:col-span-2"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <select
            className="rounded-xl border border-outline-variant px-3 py-2"
            value={form.rol}
            onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as Usuario['rol'] }))}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="CAJERO">CAJERO</option>
            <option value="BODEGUERO">BODEGUERO</option>
          </select>
          <input
            className="rounded-xl border border-outline-variant px-3 py-2"
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="Telefono"
          />
          <select
            className="rounded-xl border border-outline-variant px-3 py-2"
            value={form.sedeId}
            onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
          >
            <option value="">Sin sede</option>
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
          <textarea
            className="rounded-xl border border-outline-variant px-3 py-2 md:col-span-2"
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            placeholder="Notas internas"
          />
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.forzarCambioPassword}
              onChange={(e) => setForm((f) => ({ ...f, forzarCambioPassword: e.target.checked }))}
            />
            Forzar cambio de contrasena en proximo login
          </label>
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
            />
            Usuario activo
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-xl bg-surface-3 px-3 py-2" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-on-primary"
            onClick={() => {
              update.mutate(
                {
                  nombre: form.nombre.trim(),
                  apellido: form.apellido.trim(),
                  email: form.email.trim(),
                  rol: form.rol,
                  sedeId: form.sedeId || null,
                  telefono: form.telefono || null,
                  notas: form.notas || null,
                  activo: form.activo,
                  forzarCambioPassword: form.forzarCambioPassword,
                },
                { onSuccess: onClose },
              );
            }}
            disabled={update.isPending}
          >
            {update.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
