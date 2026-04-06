import {
  BarChart2,
  LayoutDashboard,
  CreditCard,
  FileText,
  Handshake,
  LogOut,
  Package,
  Sparkles,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Permiso, PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import type { AuthUser } from '@/hooks/useAuth';

interface SideNavProps {
  user: AuthUser | null;
  onLogout: () => void;
}

type NavItem = {
  icon: typeof CreditCard;
  label: string;
  to: string;
  permiso?: Permiso;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard', permiso: Permiso.REPORTES_VER },
  { icon: CreditCard, label: 'POS', to: '/pos', permiso: Permiso.VENTAS_VER },
  { icon: Users, label: 'Clientes', to: '/clientes', permiso: Permiso.VENTAS_VER },
  { icon: Handshake, label: 'CRM', to: '/crm', permiso: Permiso.VENTAS_VER },
  { icon: FileText, label: 'Comercial', to: '/comercial', permiso: Permiso.VENTAS_VER },
  { icon: Wallet, label: 'Caja', to: '/caja', permiso: Permiso.CAJA_VER_HISTORIAL },
  { icon: Users, label: 'Usuarios', to: '/usuarios', permiso: Permiso.USUARIOS_VER },
  { icon: BarChart2, label: 'Reportes', to: '/reportes', permiso: Permiso.REPORTES_VER },
  { icon: Truck, label: 'Proveedores', to: '/proveedores', permiso: Permiso.CATALOGO_VER },
  { icon: FileText, label: 'Ordenes', to: '/ordenes-compra', permiso: Permiso.CATALOGO_VER },
  { icon: Package, label: 'Inventario', to: '/inventario', disabled: true },
];

export default function SideNav({ user, onLogout }: SideNavProps) {
  const permisosRol = user
    ? (PERMISOS_POR_ROL[user.rol as keyof typeof PERMISOS_POR_ROL] ?? [])
    : [];
  const permisosExtra = user?.permisosExtra ?? [];
  const revocados = new Set(user?.permisosRevocados ?? []);
  const permisosEfectivos = new Set(
    [...permisosRol, ...permisosExtra].filter((permiso) => !revocados.has(permiso)),
  );

  const puedeVer = (permiso?: Permiso) => {
    if (!permiso) {
      return true;
    }
    return permisosEfectivos.has(permiso);
  };

  return (
    <nav className="flex flex-col h-full w-[72px] bg-surface-1 border-r border-outline-variant py-4 items-center gap-2 shrink-0">
      <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center mb-4 shrink-0">
        <Sparkles className="w-5 h-5 text-on-primary" />
      </div>

      <div className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems
          .filter((item) => !item.permiso || puedeVer(item.permiso))
          .map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <button
                  key={item.label}
                  title={item.label}
                  disabled
                  className="relative flex flex-col items-center justify-center rounded-2xl h-14 w-full gap-0.5 text-[10px] font-medium text-outline cursor-not-allowed opacity-70"
                >
                  <Icon className="w-[22px] h-[22px]" />
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center rounded-2xl h-14 w-full gap-0.5 text-[10px] font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-3'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-[22px] h-[22px]" />
                    <span className="leading-none">{item.label}</span>
                    {isActive ? (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
      </div>

      <div className="flex flex-col items-center gap-2 w-full px-2">
        <div
          className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm"
          title={user?.email ?? ''}
        >
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesion"
          className="flex items-center justify-center w-10 h-10 rounded-2xl text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
