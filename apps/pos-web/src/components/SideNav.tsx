import type { AuthUser } from '@/hooks/useAuth';

interface SideNavProps {
  user: AuthUser | null;
  onLogout: () => void;
}

const navItems = [
  { icon: 'point_of_sale', label: 'POS', active: true },
  { icon: 'inventory_2', label: 'Inventario', active: false },
  { icon: 'people', label: 'Clientes', active: false },
  { icon: 'bar_chart', label: 'Reportes', active: false },
];

export default function SideNav({ user, onLogout }: SideNavProps) {
  return (
    <nav className="flex flex-col h-full w-[72px] bg-surface-1 border-r border-outline-variant py-4 items-center gap-2 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center mb-4 shrink-0">
        <span className="material-icon text-on-primary text-xl filled">local_pharmacy</span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.icon}
            title={item.label}
            className={`relative flex flex-col items-center justify-center rounded-2xl h-14 w-full gap-0.5 text-[10px] font-medium transition-all duration-200 group
              ${item.active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-3'
              }`}
          >
            <span className={`material-icon text-[22px] ${item.active ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span className="leading-none">{item.label}</span>
            {item.active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}
          </button>
        ))}
      </div>

      {/* User + Logout */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <div
          className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm"
          title={user?.email ?? ''}
        >
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className="flex items-center justify-center w-10 h-10 rounded-2xl text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
        >
          <span className="material-icon text-xl">logout</span>
        </button>
      </div>
    </nav>
  );
}
