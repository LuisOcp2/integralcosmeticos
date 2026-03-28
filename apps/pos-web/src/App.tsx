import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';

const DEFAULT_SEDE = import.meta.env.VITE_DEFAULT_SEDE_ID ?? 'sede-default';

export default function App() {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          // Re-read user from localStorage after successful login
          const token = localStorage.getItem('pos_token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setCurrentUser({
                id: payload.sub,
                email: payload.email,
                rol: payload.rol,
                sedeId: payload.sedeId,
              });
            } catch {
              // keep null
            }
          }
        }}
      />
    );
  }

  const sedeId = currentUser.sedeId ?? DEFAULT_SEDE;

  return <POSPage user={currentUser} sedeId={sedeId} />;
}
