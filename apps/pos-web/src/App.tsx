import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/hooks/useAuth';
import { PERMISOS_POR_ROL, Permiso } from '@cosmeticos/shared-types';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CajaPage from '@/pages/CajaPage';
import UsuariosPage from '@/modules/usuarios/pages/UsuariosPage';

const DEFAULT_SEDE = import.meta.env.VITE_DEFAULT_SEDE_ID ?? 'sede-default';

export default function App() {
  const { user, refreshMe } = useAuth();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(user);
  const [view, setView] = useState<'pos' | 'caja' | 'usuarios'>('pos');

  useEffect(() => {
    setCurrentUser(user);
    if (!user) {
      setView('pos');
    }
  }, [user]);

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          void refreshMe().then((me) => {
            if (me) setCurrentUser(me);
          });
        }}
      />
    );
  }

  const sedeId = currentUser.sedeId ?? DEFAULT_SEDE;

  const permisosRol = PERMISOS_POR_ROL[currentUser.rol as keyof typeof PERMISOS_POR_ROL] ?? [];
  const permisosExtra = currentUser.permisosExtra ?? [];
  const revocados = new Set(currentUser.permisosRevocados ?? []);
  const permisosEfectivos = new Set(
    [...permisosRol, ...permisosExtra].filter((p) => !revocados.has(p)),
  );
  const puedeVerUsuarios = permisosEfectivos.has(Permiso.USUARIOS_VER);

  if (view === 'caja') {
    return (
      <CajaPage
        user={currentUser}
        sedeId={sedeId}
        onOpenPos={() => setView('pos')}
        onOpenUsuarios={() => setView('usuarios')}
      />
    );
  }

  if (view === 'usuarios') {
    if (!puedeVerUsuarios) {
      return (
        <div className="grid h-screen place-items-center bg-background p-6">
          <div className="max-w-md rounded-2xl border border-outline-variant bg-surface p-6 text-center">
            <h1 className="text-xl font-bold text-on-background">Acceso denegado</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              No tienes permisos para acceder al modulo de usuarios.
            </p>
            <button onClick={() => setView('pos')} className="btn btn-primary btn-sm mt-4">
              Volver al POS
            </button>
          </div>
        </div>
      );
    }
    return <UsuariosPage onBackToPos={() => setView('pos')} />;
  }

  return (
    <POSPage
      user={currentUser}
      sedeId={sedeId}
      onOpenCaja={() => setView('caja')}
      onOpenUsuarios={() => setView('usuarios')}
    />
  );
}
