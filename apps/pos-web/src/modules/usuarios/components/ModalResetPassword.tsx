import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import type { Usuario } from '../api/usuarios.api';
import { useResetPasswordAdmin } from '../hooks/useUsuarios';

interface Props {
  usuario: Usuario;
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

export const ModalResetPassword = ({ usuario, onClose }: Props) => {
  const mutation = useResetPasswordAdmin(usuario.id);
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [motivo, setMotivo] = useState('');
  const [forzarCambio, setForzarCambio] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const strength = passwordStrength(passwordNuevo);
  const noMatch = passwordNuevo !== confirmar;
  const tooShort = passwordNuevo.length > 0 && passwordNuevo.length < 8;
  const canSubmit = passwordNuevo.length >= 8 && !noMatch;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-warning" />
            <h3 className="text-base font-bold text-on-background">Restablecer contraseña</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span className="text-on-surface-variant">Usuario: </span>
            <span className="font-medium">
              {usuario.nombre} {usuario.apellido}
            </span>
            <span className="ml-2 text-xs text-on-surface-variant">({usuario.email})</span>
          </div>

          {/* Nueva contraseña */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Nueva contraseña *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Mínimo 8 caracteres"
                value={passwordNuevo}
                onChange={(e) => setPasswordNuevo(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordNuevo && (
              <div className="mt-1">
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
            {submitted && tooShort && (
              <p className="flex items-center gap-1 text-xs text-error">
                <AlertCircle size={11} /> Mínimo 8 caracteres
              </p>
            )}
          </div>

          {/* Confirmar */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Confirmar contraseña *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Repetir contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {submitted && confirmar && noMatch && (
              <p className="flex items-center gap-1 text-xs text-error">
                <AlertCircle size={11} /> Las contraseñas no coinciden
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Motivo (opcional)</label>
            <textarea
              rows={2}
              className="rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Razón del restablecimiento…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              checked={forzarCambio}
              onChange={(e) => setForzarCambio(e.target.checked)}
            />
            Forzar cambio en el siguiente inicio de sesión
          </label>
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
            className="flex-1 rounded-xl bg-warning px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setSubmitted(true);
              if (!canSubmit) return;
              mutation.mutate(
                { passwordNuevo, motivo: motivo || undefined, forzarCambio },
                { onSuccess: onClose },
              );
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Procesando…' : 'Restablecer contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
};
