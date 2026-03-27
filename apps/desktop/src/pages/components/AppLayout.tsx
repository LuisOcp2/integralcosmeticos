import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Rol } from '@cosmeticos/shared-types';
import { canAccessPath, useAuthStore } from '../../store/auth.store';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems: Array<{ to: string; label: string; roles?: Rol[] }> = [
  { to: '/dashboard', label: '📊 Dashboard', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/reportes', label: '📈 Reportes', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/sync', label: '☁️ Sincronizacion', roles: [Rol.ADMIN] },
  { to: '/sedes', label: 'Sedes', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/productos', label: 'Productos' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/caja', label: 'Caja' },
  { to: '/pos', label: 'POS' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();

  const visibles = navItems.filter((item) => {
    if (!usuario) {
      return false;
    }

    return canAccessPath(usuario.rol, item.to) && (!item.roles || item.roles.includes(usuario.rol));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50">
      <header className="border-b border-rose-100 bg-white/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <button
            className="text-left text-lg font-semibold text-rose-900"
            onClick={() => navigate('/dashboard')}
          >
            Integral Cosmeticos
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
              {usuario?.nombre} {usuario?.apellido} · {usuario?.rol}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            {visibles.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-900 hover:bg-rose-50 hover:text-rose-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
