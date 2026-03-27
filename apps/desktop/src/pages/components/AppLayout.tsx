import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Rol } from '@cosmeticos/shared-types';
import { canAccessPath, useAuthStore } from '../../store/auth.store';
import { tokens } from '../../styles/tokens';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems: Array<{ to: string; label: string; icon: string; roles?: Rol[] }> = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/pos', label: 'POS', icon: 'point_of_sale' },
  { to: '/caja', label: 'Caja', icon: 'payments' },
  { to: '/clientes', label: 'Clientes', icon: 'group' },
  { to: '/inventario', label: 'Inventario', icon: 'inventory_2' },
  { to: '/productos', label: 'Productos', icon: 'inventory' },
  { to: '/reportes', label: 'Reportes', icon: 'bar_chart', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/sedes', label: 'Sedes', icon: 'storefront', roles: [Rol.ADMIN, Rol.SUPERVISOR] },
  { to: '/sync', label: 'Sync Cloud', icon: 'sync', roles: [Rol.ADMIN] },
];

const ui = {
  topbarBg: tokens.color.textMuted,
  topbarText: '#ffffff',
  chipBg: 'rgba(255,255,255,0.16)',
  roleBg: tokens.color.accent,
  sidebarBg: '#f1edef',
  sidebarText: '#554246',
  sidebarMuted: tokens.color.textMuted,
  navHover: '#e5e1e3',
  navActiveBg: tokens.color.accent,
  navActiveBorder: tokens.color.textStrong,
  mainBg: tokens.color.bgPage,
};

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const visibles = navItems.filter((item) => {
    if (!usuario) return false;
    return canAccessPath(usuario.rol, item.to) && (!item.roles || item.roles.includes(usuario.rol));
  });

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0&display=swap"
        rel="stylesheet"
      />

      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-4 md:px-6 lg:px-8 h-16 shadow-sm"
        style={{ backgroundColor: ui.topbarBg, color: ui.topbarText }}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="lg:hidden h-11 w-11 grid place-items-center rounded-xl transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={isSidebarOpen ? 'Cerrar menu lateral' : 'Abrir menu lateral'}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {isSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-lg md:text-2xl font-extrabold tracking-tight text-white cursor-pointer rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            type="button"
          >
            Integral Cosméticos
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span
            className="hidden sm:inline-flex text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: ui.chipBg }}
          >
            {usuario?.nombre} {usuario?.apellido}
          </span>
          <span
            className="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest"
            style={{ backgroundColor: ui.roleBg, color: '#fff' }}
          >
            {usuario?.rol}
          </span>
          <button
            onClick={logout}
            className="h-11 w-11 grid place-items-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            title="Cerrar sesión"
            aria-label="Cerrar sesion"
            type="button"
          >
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>
              logout
            </span>
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        <button
          type="button"
          onClick={closeSidebar}
          className={`lg:hidden fixed inset-0 z-30 bg-black/35 transition-opacity ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!isSidebarOpen}
          tabIndex={-1}
        />

        <aside
          className={`fixed left-0 top-16 flex flex-col py-6 gap-1 z-40 transition-transform duration-200 motion-reduce:transition-none ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
          style={{
            width: 240,
            height: 'calc(100dvh - 64px)',
            backgroundColor: ui.sidebarBg,
          }}
          aria-label="Menu principal"
        >
          <div className="px-6 mb-4">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: ui.sidebarMuted }}
            >
              Menú principal
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {visibles.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A43E63] ${
                    isActive ? 'text-white border-r-4' : 'hover:bg-[#e5e1e3]'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: ui.navActiveBg,
                        borderColor: ui.navActiveBorder,
                        color: '#fff',
                      }
                    : { color: ui.sidebarText }
                }
                aria-current={location.pathname === item.to ? 'page' : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main
          className="flex-1 min-h-screen p-4 md:p-6 lg:p-8"
          style={{ marginLeft: 0, backgroundColor: ui.mainBg }}
        >
          {children}
        </main>
      </div>

      <style>{`@media (min-width: 1024px){ main { margin-left: 240px !important; } }`}</style>
    </div>
  );
}
