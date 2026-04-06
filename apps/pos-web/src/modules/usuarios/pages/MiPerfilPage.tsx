import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCambiarPasswordPropia } from '../hooks/useUsuarios';
import { BadgeRol } from '../components/BadgeRol';
import { useSedes } from '@/hooks/useSedes';

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

export const MiPerfilPage = () => {
  const { user } = useAuth();
  const { data: sedes = [] } = useSedes();
  const cambiarPassword = useCambiarPasswordPropia(user?.id ?? '');
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!user) return <div className="p-6">No autenticado.</div>;

  const sedeNombre = (user as any).sedeId
    ? (sedes.find((s) => s.id === (user as any).sedeId)?.nombre ?? 'Sede no disponible')
    : null;

  const strength = passwordStrength(passwordNuevo);
  const noMatch = passwordNuevo !== confirmar;
  const canSubmit = passwordActual.length > 0 && passwordNuevo.length >= 8 && !noMatch;

  const initials =
    `${(user as any).nombre?.[0] ?? ''}${(user as any).apellido?.[0] ?? ''}`.toUpperCase() ||
    user.email[0].toUpperCase();

  return (
    <div className="max-w-2xl space-y-4 p-6">
      {/* Perfil */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-on-background">
                {(user as any).nombre} {(user as any).apellido}
              </h1>
              <BadgeRol rol={user.rol} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Mail size={11} /> {user.email}
              </span>
              {sedeNombre && (
                <span className="flex items-center gap-1">
                  <User size={11} /> {sedeNombre}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Shield size={12} className="text-primary" />
            <span className="font-medium">Permisos activos del rol:</span>
            <span className="ml-auto font-bold text-on-background">{user.rol}</span>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-5">
        <h2 className="mb-4 text-base font-bold text-on-background">Cambiar contraseña</h2>
        <div className="space-y-3">
          {/* Contraseña actual */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">
              Contraseña actual *
            </label>
            <div className="relative">
              <input
                type={showActual ? 'text' : 'password'}
                className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowActual((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {submitted && !passwordActual && (
              <p className="flex items-center gap-1 text-xs text-error">
                <AlertCircle size={11} /> Requerida
              </p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">
              Nueva contraseña *
            </label>
            <div className="relative">
              <input
                type={showNuevo ? 'text' : 'password'}
                className="w-full rounded-xl border border-outline-variant bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Mínimo 8 caracteres"
                value={passwordNuevo}
                onChange={(e) => setPasswordNuevo(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNuevo((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                {showNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
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
          </div>

          {/* Confirmar */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">
              Confirmar nueva contraseña *
            </label>
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

          <button
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              setSubmitted(true);
              if (!canSubmit) return;
              await cambiarPassword.mutateAsync({ passwordActual, passwordNuevo });
              setPasswordActual('');
              setPasswordNuevo('');
              setConfirmar('');
              setSubmitted(false);
            }}
            disabled={cambiarPassword.isPending}
          >
            {cambiarPassword.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
};
