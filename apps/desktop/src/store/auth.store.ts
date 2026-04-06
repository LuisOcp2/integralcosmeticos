import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IUsuario, Rol } from '@cosmeticos/shared-types';

const baseRolePaths: Record<Rol, string[]> = {
  [Rol.CAJERO]: ['/pos', '/caja', '/clientes'],
  [Rol.BODEGUERO]: ['/inventario', '/productos', '/proveedores', '/ordenes-compra'],
  [Rol.SUPERVISOR]: [
    '/dashboard',
    '/reportes',
    '/configuraciones',
    '/usuarios',
    '/pos',
    '/caja',
    '/clientes',
    '/inventario',
    '/productos',
    '/sedes',
    '/proveedores',
    '/ordenes-compra',
  ],
  [Rol.ADMIN]: [
    '/dashboard',
    '/reportes',
    '/configuraciones',
    '/usuarios',
    '/sync',
    '/importaciones',
    '/diagnostico',
    '/sedes',
    '/productos',
    '/inventario',
    '/clientes',
    '/caja',
    '/pos',
    '/proveedores',
    '/ordenes-compra',
  ],
};

export function getAllowedPathsByRole(rol: Rol): string[] {
  return baseRolePaths[rol] ?? [];
}

export function canAccessPath(rol: Rol, path: string): boolean {
  return getAllowedPathsByRole(rol).includes(path);
}

interface AuthState {
  usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'> | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'>) => void;
  setUsuario: (usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      accessToken: null,
      isAuthenticated: false,
      login: (accessToken, usuario) => set({ accessToken, usuario, isAuthenticated: true }),
      setUsuario: (usuario) => set((state) => ({ ...state, usuario })),
      logout: () => set({ accessToken: null, usuario: null, isAuthenticated: false }),
    }),
    {
      name: 'cosmeticos-auth',
    },
  ),
);
