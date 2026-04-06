'use client';

import * as React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  BarChart2,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

const STORAGE_KEY = 'sidebar-collapsed';

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const handler = () => setMatches(mediaQuery.matches);
    handler();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Modelo de item de navegacion para el arbol del sidebar. */
export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  status?: 'ok' | 'warn' | 'error';
  children?: NavItem[];
}

/** Modelo de seccion agrupada renderizada en el sidebar. */
export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Props publicas del sidebar con secciones y datos de usuario. */
export interface SidebarProps {
  sections: NavSection[];
  user: {
    name: string;
    email: string;
    avatarUrl: string;
    role: string;
  };
  onNavigate?: (href: string) => void;
  defaultCollapsed?: boolean;
}

const DEFAULT_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Panel', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Analítica', icon: BarChart2, href: '/reportes', badge: 2 },
      { label: 'Reportes', icon: FileText, href: '/reportes' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Productos', icon: Package, href: '/productos' },
      {
        label: 'Inventario',
        icon: Boxes,
        href: '/inventario',
        children: [
          { label: 'Existencias', icon: Boxes, href: '/inventario/stock', badge: 3 },
          { label: 'Movimientos', icon: RefreshCw, href: '/inventario/movimientos' },
        ],
      },
      { label: 'Clientes', icon: Users, href: '/clientes' },
      { label: 'Ventas POS', icon: ShoppingCart, href: '/pos' },
      { label: 'Caja', icon: Wallet, href: '/caja' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Sedes', icon: Building2, href: '/sedes' },
      { label: 'Sincronización', icon: RefreshCw, href: '/sync' },
      { label: 'Configuración', icon: Settings, href: '/configuraciones' },
    ],
  },
];

const DEFAULT_USER: SidebarProps['user'] = {
  name: 'Maria Fernanda',
  email: 'maria@integralcosmeticos.com',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
  role: 'Administrador',
};

function getFirstHref(sections: NavSection[]): string {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.children?.length) return item.children[0].href;
      return item.href;
    }
  }
  return '/';
}

function collectParentMap(sections: NavSection[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of sections) {
    for (const item of section.items) {
      if (!item.children) continue;
      for (const child of item.children) {
        map[child.href] = item.href;
      }
    }
  }
  return map;
}

type AnimatedMenuToggleProps = {
  open: boolean;
  onToggle: () => void;
};

function AnimatedMenuToggle({ open, onToggle }: AnimatedMenuToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-[#1a0f07]/95 text-white shadow-lg backdrop-blur md:hidden"
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      whileTap={{ scale: 0.92 }}
    >
      <span className="relative h-5 w-5">
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: open ? 0 : 1, rotate: open ? -90 : 0, scale: open ? 0.7 : 1 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          <Menu size={20} />
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{ opacity: open ? 1 : 0, rotate: open ? 0 : 90, scale: open ? 1 : 0.7 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          <X size={20} />
        </motion.span>
      </span>
    </motion.button>
  );
}

type NavItemComponentProps = {
  item: NavItem;
  collapsed: boolean;
  activeHref: string;
  isOpen: boolean;
  onToggleOpen: (href: string) => void;
  onNavigate: (href: string) => void;
  closeMobile: () => void;
};

function NavItemComponent({
  item,
  collapsed,
  activeHref,
  isOpen,
  onToggleOpen,
  onNavigate,
  closeMobile,
}: NavItemComponentProps) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = activeHref === item.href;

  if (hasChildren) {
    return (
      <CollapsibleSection
        item={item}
        collapsed={collapsed}
        open={isOpen}
        activeHref={activeHref}
        onToggle={() => onToggleOpen(item.href)}
        onNavigate={(href) => {
          onNavigate(href);
          closeMobile();
        }}
      />
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          onNavigate(item.href);
          closeMobile();
        }}
        className={cn(
          'group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium',
          'transition-all duration-200 ease-out',
          isActive
            ? 'bg-gradient-to-r from-[#8f2c54] to-[#702040] text-white shadow-[0_8px_22px_rgba(133,38,75,0.38)]'
            : 'text-white/80 hover:bg-white/8 hover:text-white',
        )}
      >
        {isActive && (
          <motion.span
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#ffd8e7]"
          />
        )}

        <item.icon size={18} className="relative z-10 shrink-0" />

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key={`${item.href}-label`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {item.status && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className={cn(
              'relative z-10 ml-auto inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[#24150d]',
              item.status === 'ok'
                ? 'bg-emerald-500'
                : item.status === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-red-500',
              collapsed && 'absolute right-2 top-2',
            )}
          />
        )}

        {!item.status && item.badge && item.badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className={cn(
              'relative z-10 ml-auto inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#24150d]',
              collapsed && 'absolute right-2 top-2',
            )}
          />
        )}

        {collapsed && (
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#221208] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            {item.label}
          </div>
        )}
      </button>
    </div>
  );
}

type CollapsibleSectionProps = {
  item: NavItem;
  collapsed: boolean;
  open: boolean;
  activeHref: string;
  onToggle: () => void;
  onNavigate: (href: string) => void;
};

function CollapsibleSection({
  item,
  collapsed,
  open,
  activeHref,
  onToggle,
  onNavigate,
}: CollapsibleSectionProps) {
  const hasActiveChild = item.children?.some((child) => child.href === activeHref);
  const parentActive = activeHref === item.href || hasActiveChild;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium',
          'transition-all duration-200 ease-out',
          parentActive
            ? 'bg-gradient-to-r from-[#8f2c54] to-[#702040] text-white shadow-[0_8px_22px_rgba(133,38,75,0.38)]'
            : 'text-white/80 hover:bg-white/8 hover:text-white',
        )}
      >
        {parentActive && (
          <motion.span
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#ffd8e7]"
          />
        )}

        <item.icon size={18} className="relative z-10 shrink-0" />

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key={`${item.href}-section-label`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex-1 truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {!collapsed && (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            <ChevronDown size={16} />
          </motion.span>
        )}

        {collapsed && (
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#221208] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            {item.label}
          </div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 pl-6">
              {item.children?.map((child) => {
                const isChildActive = activeHref === child.href;
                return (
                  <button
                    key={`${item.href}:${child.label}:${child.href}`}
                    type="button"
                    onClick={() => onNavigate(child.href)}
                    className={cn(
                      'group relative flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm',
                      'transition-all duration-200 ease-out',
                      isChildActive
                        ? 'bg-[#7c294a] text-white'
                        : 'text-white/70 hover:bg-white/7 hover:text-white',
                    )}
                  >
                    {isChildActive && (
                      <motion.span
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#ffd8e7]"
                      />
                    )}
                    <child.icon size={14} className="relative z-10 shrink-0" />
                    <span className="relative z-10 truncate">{child.label}</span>

                    {child.badge && child.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                        className="relative z-10 ml-auto inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#24150d]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type UserProfileProps = {
  user: SidebarProps['user'];
  collapsed: boolean;
  onLogout: () => void;
};

function UserProfile({ user, collapsed, onLogout }: UserProfileProps) {
  return (
    <div className="relative border-t border-white/10 p-3">
      <div className="group relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="relative shrink-0">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-10 w-10 rounded-full border border-white/20 object-cover"
            loading="lazy"
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1a0f07] bg-emerald-500" />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              key="user-text"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-white/60">{user.role}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        )}

        {collapsed && (
          <div className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-white/15 bg-[#221208] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            {user.name}
          </div>
        )}
      </div>
    </div>
  );
}

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      className="absolute right-0 top-20 z-50 hidden h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-[#1f1209] text-white shadow-[0_10px_22px_rgba(0,0,0,0.45)] md:inline-flex"
      whileTap={{ scale: 0.9 }}
    >
      <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.22 }}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </motion.span>
    </motion.button>
  );
}

/** Sidebar responsive de produccion con navegacion tipada y animaciones de Framer Motion. */
export function Sidebar(props: Partial<SidebarProps> = {}) {
  const {
    sections = DEFAULT_SECTIONS,
    user = DEFAULT_USER,
    onNavigate,
    defaultCollapsed = false,
  } = props;

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [activeHref, setActiveHref] = React.useState(getFirstHref(sections));
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});

  const parentMap = React.useMemo(() => collectParentMap(sections), [sections]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const width = isMobile ? 0 : collapsed ? 72 : 260;
    document.documentElement.style.setProperty('--sidebar-offset', `${width}px`);
    window.dispatchEvent(
      new CustomEvent('sidebar:offset-change', {
        detail: { width, collapsed, mobile: isMobile },
      }),
    );
  }, [collapsed, isMobile]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (!currentPath) return;
    setActiveHref(currentPath);

    const parentHref = parentMap[currentPath];
    if (parentHref) {
      setOpenMap((prev) => ({ ...prev, [parentHref]: true }));
    }
  }, [parentMap]);

  const handleNavigate = (href: string) => {
    setActiveHref(href);

    const parentHref = parentMap[href];
    if (parentHref) {
      setOpenMap((prev) => ({ ...prev, [parentHref]: true }));
    }

    if (onNavigate) onNavigate(href);
  };

  const renderContent = () => (
    <div className="relative flex h-full flex-col border-r border-white/10 bg-[#1a0f07] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(133,38,75,0.34),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_100%,rgba(245,128,167,0.14),transparent_30%)]" />

      <div className="relative flex h-16 items-center px-4">
        <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#a93f67] to-[#6f1f3e] text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(133,38,75,0.45)]">
          IC
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand-title"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="min-w-0"
            >
              <p className="truncate text-sm font-semibold tracking-wide text-white">
                Integral Cosméticos
              </p>
              <p className="truncate text-xs text-white/60">{user.email}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          'sidebar-scroll relative flex-1 space-y-4 overflow-y-auto px-3 pb-3',
          collapsed ? 'sidebar-scroll-collapsed' : 'sidebar-scroll-expanded',
        )}
      >
        <LayoutGroup>
          {sections.map((section) => (
            <section key={section.title} className="space-y-1">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.h3
                    key={`${section.title}-title`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40"
                  >
                    {section.title}
                  </motion.h3>
                )}
              </AnimatePresence>

              {section.items.map((item) => (
                <NavItemComponent
                  key={`${section.title}:${item.label}:${item.href}`}
                  item={item}
                  collapsed={collapsed}
                  activeHref={activeHref}
                  isOpen={Boolean(openMap[item.href])}
                  onToggleOpen={(href) => setOpenMap((prev) => ({ ...prev, [href]: !prev[href] }))}
                  onNavigate={handleNavigate}
                  closeMobile={() => setMobileOpen(false)}
                />
              ))}
            </section>
          ))}
        </LayoutGroup>
      </div>

      <UserProfile user={user} collapsed={collapsed} onLogout={() => handleNavigate('/logout')} />
    </div>
  );

  return (
    <>
      <AnimatedMenuToggle open={mobileOpen} onToggle={() => setMobileOpen((prev) => !prev)} />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-40 w-[260px] md:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {renderContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.aside
        className="fixed inset-y-0 left-0 z-40 hidden md:block"
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        {renderContent()}
      </motion.aside>
    </>
  );
}
