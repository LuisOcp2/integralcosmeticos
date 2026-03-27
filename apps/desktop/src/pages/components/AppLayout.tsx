import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Rol } from '@cosmeticos/shared-types';
import { canAccessPath, useAuthStore } from '../../store/auth.store';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems: Array<{ to: string; label: string; icon: string; roles?: Rol[] }> = [
  { to: '/dashboard', label: 'Dashboard',   icon: 'dashboard',      roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/pos',       label: 'POS',          icon: 'point_of_sale' },
  { to: '/caja',      label: 'Caja',         icon: 'payments' },
  { to: '/clientes',  label: 'Clientes',     icon: 'group' },
  { to: '/inventario',label: 'Inventario',   icon: 'inventory_2' },
  { to: '/productos', label: 'Productos',    icon: 'inventory' },
  { to: '/reportes',  label: 'Reportes',     icon: 'bar_chart',      roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/sedes',     label: 'Sedes',        icon: 'storefront',     roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/sync',      label: 'Sync Cloud',   icon: 'sync',           roles: [Rol.ADMIN] },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();

  const visibles = navItems.filter((item) => {
    if (!usuario) return false;
    return canAccessPath(usuario.rol, item.to) && (!item.roles || item.roles.includes(usuario.rol));
  });

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Google Fonts + Material Symbols */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0&display=swap"
        rel="stylesheet"
      />

      {/* Top Nav */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-16 shadow-sm"
        style={{ backgroundColor: '#735946', color: '#fff' }}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-2xl font-extrabold tracking-tight text-white"
          >
            Integral Cosméticos
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {usuario?.nombre} {usuario?.apellido}
          </span>
          <span
            className="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest"
            style={{ backgroundColor: '#A43E63', color: '#fff' }}
          >
            {usuario?.rol}
          </span>
          <button
            onClick={logout}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>logout</span>
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className="fixed left-0 top-16 flex flex-col py-6 gap-1 z-40"
          style={{
            width: 240,
            height: 'calc(100vh - 64px)',
            backgroundColor: '#f1edef',
          }}
        >
          <div className="px-6 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#735946' }}>
              Menú principal
            </p>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            {visibles.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-white border-r-4'
                      : 'hover:bg-[#e5e1e3]'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: '#A43E63', borderColor: '#2E1B0C', color: '#fff' }
                    : { color: '#554246' }
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className="flex-1 min-h-screen p-8"
          style={{ marginLeft: 240, backgroundColor: '#F3EFF1' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
