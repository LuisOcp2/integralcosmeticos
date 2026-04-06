import { useCallback, useSyncExternalStore } from 'react';
import { apiClient } from '@/lib/api';

export interface AuthUser {
  id: string;
  nombre?: string;
  apellido?: string;
  email: string;
  rol: string;
  sedeId?: string;
  permisosExtra?: string[];
  permisosRevocados?: string[];
  forzarCambioPassword?: boolean;
}

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem('pos_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

let state: AuthState = {
  user: loadUser(),
  loading: false,
  error: null,
};

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const setState = (partial: Partial<AuthState>) => {
  state = { ...state, ...partial };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const login = useCallback(async (email: string, password: string) => {
    setState({ loading: true, error: null });
    try {
      const res = await apiClient.post<{ accessToken: string; usuario: AuthUser }>('/auth/login', {
        email,
        password,
      });
      const { accessToken, usuario } = res.data;
      localStorage.setItem('pos_token', accessToken);
      localStorage.setItem('pos_user', JSON.stringify(usuario));
      const usr = usuario;
      setState({ user: usr });
      return usr;
    } catch {
      setState({ error: 'Credenciales inválidas. Verifica tu email y contraseña.' });
      return null;
    } finally {
      setState({ loading: false });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setState({ user: null, error: null, loading: false });
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const res = await apiClient.get<AuthUser>('/usuarios/me');
      localStorage.setItem('pos_user', JSON.stringify(res.data));
      setState({ user: res.data });
      return res.data;
    } catch {
      return null;
    }
  }, []);

  return {
    user: snapshot.user,
    login,
    logout,
    refreshMe,
    loading: snapshot.loading,
    error: snapshot.error,
  };
}
