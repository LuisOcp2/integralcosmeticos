import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CajaPage from '@/pages/CajaPage';
import UsuariosPage from '@/pages/UsuariosPage';

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
