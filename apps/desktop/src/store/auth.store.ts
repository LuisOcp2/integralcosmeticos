import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IUsuario } from '@cosmeticos/shared-types';

interface AuthState {
  usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'> | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      accessToken: null,
      isAuthenticated: false,
      login: (accessToken, usuario) =>
        set({ accessToken, usuario, isAuthenticated: true }),
      logout: () =>
        set({ accessToken: null, usuario: null, isAuthenticated: false }),
    }),
    {
      name: 'cosmeticos-auth',
    },
  ),
);
