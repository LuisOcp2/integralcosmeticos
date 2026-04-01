import { useState, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Usuario } from '../api/usuarios.api';
import { useActualizarUsuario } from '../hooks/useUsuarios';
import { useSedes } from '@/hooks/useSedes';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const ModalEditarUsuario = ({ usuario, onClose }: Props) => {
  const update = useActualizarUsuario(usuario.id);
  const { data: sedes = [] } = useSedes();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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
  const originalRef = useRef(form);

  const isDirty =
    form.nombre !== originalRef.current.nombre ||
    form.apellido !== originalRef.current.apellido ||
    form.email !== originalRef.current.email ||
    form.rol !== originalRef.current.rol ||
    form.sedeId !== originalRef.current.sedeId ||
    form.telefono !== originalRef.current.telefono ||
    form.notas !== originalRef.current.notas ||
    form.forzarCambioPassword !== originalRef.current.forzarCambioPassword ||
    form.activo !== originalRef.current.activo;

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const errors = {
    nombre: !form.nombre.trim() ? 'Requerido' : '',
    apellido: !form.apellido.trim() ? 'Requerido' : '',
    email: !form.email.trim() ? 'Requerido' : !isValidEmail(form.email) ? 'Email inválido' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleClose = () => {
    if (isDirty && !confirm('Hay cambios sin guardar. ¿Descartar?')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-on-background">Editar usuario</h3>
            <p className="text-xs text-on-surface-variant">
              {usuario.nombre} {usuario.apellido}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                Cambios sin guardar
              </span>
            )}
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {([
              ['nombre', 'Nombre', 'text', 'María'],
              ['apellido', 'Apellido', 'text', 'García'],
            ] as [string, string, string, string][]).map(([id, label, type, placeholder]) => (
              <div key={id} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">{label} *</label>
                <input
                  type={type}
                  className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={placeholder}
                  value={form[id as keyof typeof form] as string}
                  onChange={(e) => set(id, e.target.value)}
                  onBlur={() => touch(id)}
                />
                {touched[id] && errors[id as keyof typeof errors] && (
                  <p className="flex items-center gap-1 text-xs text-error">
                    <AlertCircle size={11} /> {errors[id as keyof typeof errors]}
                  </p>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-on-surface-variant">Email *</label>
              <input
                type="email"
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
              {touched.email && errors.email && (
                <p className="flex items-center gap-1 text-xs text-error">
                  <AlertCircle size={11} /> {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant">Rol</label>
              <select
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.rol}
                onChange={(e) => set('rol', e.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="CAJERO">Cajero</option>
                <option value="BODEGUERO">Bodeguero</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant">Teléfono</label>
              <input
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="3001234567"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant">Sede</label>
              <select
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sedeId}
                onChange={(e) => set('sedeId', e.target.value)}
              >
                <option value="">Sin sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-on-surface-variant">Notas internas</label>
              <textarea
                rows={2}
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.notas}
                onChange={(e) => set('notas', e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-primary"
                checked={form.forzarCambioPassword}
                onChange={(e) => set('forzarCambioPassword', e.target.checked)}
              />
              Forzar cambio de contraseña en próximo login
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-primary"
                checked={form.activo}
                onChange={(e) => set('activo', e.target.checked)}
              />
              Usuario activo
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-outline-variant px-5 py-4">
          <button
            className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm transition-colors hover:bg-surface-2"
            onClick={handleClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setTouched({ nombre: true, apellido: true, email: true });
              if (hasErrors) return;
              update.mutate(
                {
                  nombre: form.nombre.trim(),
                  apellido: form.apellido.trim(),
                  email: form.email.trim().toLowerCase(),
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
            disabled={update.isPending || !isDirty}
          >
            {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
