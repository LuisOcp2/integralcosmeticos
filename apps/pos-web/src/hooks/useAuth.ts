import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface AuthUser {
  id: string;
  nombre?: string;
  apellido?: string;
  email: string;
  rol: string;
  sedeId?: string;
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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ accessToken: string; usuario: AuthUser }>('/auth/login', {
        email,
        password,
      });
      const { accessToken, usuario } = res.data;
      localStorage.setItem('pos_token', accessToken);
      localStorage.setItem('pos_user', JSON.stringify(usuario));
      const usr = usuario;
      setUser(usr);
      return usr;
    } catch {
      setError('Credenciales inválidas. Verifica tu email y contraseña.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const res = await apiClient.get<AuthUser>('/usuarios/me');
      localStorage.setItem('pos_user', JSON.stringify(res.data));
      setUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  return { user, login, logout, refreshMe, loading, error };
}
