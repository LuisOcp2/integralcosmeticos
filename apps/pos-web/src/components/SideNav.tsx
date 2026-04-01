import { CreditCard, Package, Users, BarChart2, Sparkles, LogOut, Wallet } from 'lucide-react';
import type { AuthUser } from '@/hooks/useAuth';

interface SideNavProps {
  user: AuthUser | null;
  onLogout: () => void;
  currentView: 'pos' | 'caja' | 'usuarios';
  onNavigate: (view: 'pos' | 'caja' | 'usuarios') => void;
}

const navItems = [
  { icon: CreditCard, label: 'POS', view: 'pos' as const },
  { icon: Wallet, label: 'Caja', view: 'caja' as const },
  { icon: Users, label: 'Usuarios', view: 'usuarios' as const },
  { icon: Package, label: 'Inventario', disabled: true },
  { icon: Users, label: 'Clientes', disabled: true },
  { icon: BarChart2, label: 'Reportes', disabled: true },
];

export default function SideNav({ user, onLogout, currentView, onNavigate }: SideNavProps) {
  return (
    <nav className="flex flex-col h-full w-[72px] bg-surface-1 border-r border-outline-variant py-4 items-center gap-2 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center mb-4 shrink-0">
        <Sparkles className="w-5 h-5 text-on-primary" />
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.view ? currentView === item.view : false;
          return (
            <button
              key={item.label}
              title={item.label}
              onClick={() => {
                if (item.view) onNavigate(item.view);
              }}
              disabled={!item.view}
              className={`relative flex flex-col items-center justify-center rounded-2xl h-14 w-full gap-0.5 text-[10px] font-medium transition-all duration-200 group
                ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : item.disabled
                      ? 'text-outline cursor-not-allowed opacity-70'
                      : 'text-on-surface-variant hover:bg-surface-3'
                }`}
            >
              <Icon className="w-[22px] h-[22px]" />
              <span className="leading-none">{item.label}</span>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
            </button>
          );
        })}
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
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
