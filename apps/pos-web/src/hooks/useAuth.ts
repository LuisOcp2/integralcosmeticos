import { useState, useCallback } from 'react';
import { apiClient, parseJwt } from '@/lib/api';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  sedeId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  rol: string;
  sedeId?: string;
}

function loadUser(): AuthUser | null {
  const token = localStorage.getItem('pos_token');
  if (!token) return null;
  const payload = parseJwt<JwtPayload>(token);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, rol: payload.rol, sedeId: payload.sedeId };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
      const { access_token } = res.data;
      localStorage.setItem('pos_token', access_token);
      const usr = loadUser();
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

  return { user, login, logout, loading, error };
}
