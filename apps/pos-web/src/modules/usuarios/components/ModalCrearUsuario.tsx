import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useCrearUsuario } from '../hooks/useUsuarios';
import { useSedes } from '@/hooks/useSedes';
import type { Usuario } from '../api/usuarios.api';

interface Props {
  onClose: () => void;
}

const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Muy débil', color: 'bg-error' },
    1: { label: 'Débil', color: 'bg-error' },
    2: { label: 'Regular', color: 'bg-warning' },
    3: { label: 'Fuerte', color: 'bg-success' },
    4: { label: 'Muy fuerte', color: 'bg-success' },
  };
  return { score, ...map[score] };
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const ModalCrearUsuario = ({ onClose }: Props) => {
  const crear = useCrearUsuario();
  const { data: sedes = [] } = useSedes();
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'CAJERO' as Usuario['rol'],
    sedeId: '',
    telefono: '',
    notas: '',
    forzarCambioPassword: true,
  });

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const errors = {
    nombre: !form.nombre.trim() ? 'Requerido' : '',
    apellido: !form.apellido.trim() ? 'Requerido' : '',
    email: !form.email.trim()
      ? 'Requerido'
      : !isValidEmail(form.email)
        ? 'Email inválido'
        : '',
    password:
      form.password.length === 0
        ? 'Requerido'
        : form.password.length < 8
          ? 'Mínimo 8 caracteres'
          : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const strength = passwordStrength(form.password);

  const Field = ({
    label,
    id,
    children,
  }: {
    label: string;
    id: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-on-surface-variant">
        {label}
      </label>
      {children}
      {touched[id] && errors[id as keyof typeof errors] && (
        <p className="flex items-center gap-1 text-xs text-error">
          <AlertCircle size={11} /> {errors[id as keyof typeof errors]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <h3 className="text-base font-bold text-on-background">Crear usuario</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre *" id="nombre">
              <input
                id="nombre"
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="María"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                onBlur={() => touch('nombre')}
              />
            </Field>
            <Field label="Apellido *" id="apellido">
              <input
                id="apellido"
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="García"
                value={form.apellido}
                onChange={(e) => set('apellido', e.target.value)}
                onBlur={() => touch('apellido')}
              />
            </Field>

            <Field label="Email *" id="email">
              <input
                id="email"
                type="email"
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary md:col-span-2"
                placeholder="maria@empresa.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
            </Field>

            <Field label="Contraseña *" id="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          s <= strength.score ? strength.color : 'bg-surface-3'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{strength.label}</p>
                </div>
              )}
            </Field>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant">Rol *</label>
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
              <label className="text-xs font-medium text-on-surface-variant">Sede</label>
              <select
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sedeId}
                onChange={(e) => set('sedeId', e.target.value)}
              >
                <option value="">Sin sede asignada</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
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

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-on-surface-variant">Notas internas</label>
              <textarea
                rows={2}
                className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Observaciones sobre este usuario…"
                value={form.notas}
                onChange={(e) => set('notas', e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-primary"
                checked={form.forzarCambioPassword}
                onChange={(e) => set('forzarCambioPassword', e.target.checked)}
              />
              Forzar cambio de contraseña en el primer ingreso
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-outline-variant px-5 py-4">
          <button
            className="flex-1 rounded-xl border border-outline-variant px-3 py-2 text-sm transition-colors hover:bg-surface-2"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setTouched({ nombre: true, apellido: true, email: true, password: true });
              if (hasErrors) return;
              crear.mutate(
                {
                  nombre: form.nombre.trim(),
                  apellido: form.apellido.trim(),
                  email: form.email.trim().toLowerCase(),
                  password: form.password,
                  rol: form.rol,
                  sedeId: form.sedeId || undefined,
                  telefono: form.telefono || undefined,
                  notas: form.notas || undefined,
                  forzarCambioPassword: form.forzarCambioPassword,
                },
                { onSuccess: onClose },
              );
            }}
            disabled={crear.isPending}
          >
            {crear.isPending ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
};
