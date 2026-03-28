import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Rol } from '@cosmeticos/shared-types';
import { canAccessPath, useAuthStore } from '../../store/auth.store';
import type { NavSection } from '../../components/ui/sidebar';
import { Sidebar } from '../../components/ui/sidebar';
import api from '../../lib/api';
import {
  BarChart2,
  Boxes,
  Building2,
  FileText,
  FileUp,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const fullSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Panel', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Reportes', icon: FileText, href: '/reportes' },
      { label: 'Analítica', icon: BarChart2, href: '/dashboard' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Productos', icon: Package, href: '/productos' },
      { label: 'Inventario', icon: Boxes, href: '/inventario' },
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
      { label: 'Importaciones', icon: FileUp, href: '/importaciones' },
      ...(import.meta.env.DEV
        ? [{ label: 'Diagnóstico', icon: Settings, href: '/diagnostico' }]
        : []),
      { label: 'Configuración', icon: Settings, href: '/configuraciones' },
    ],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const [sidebarOffset, setSidebarOffset] = useState(260);

  const importHealthQuery = useQuery({
    queryKey: ['catalogo', 'importaciones', 'health', 'sidebar'],
    queryFn: async () => {
      const { data } = await api.get('/catalogo/importaciones/health');
      return data as { ok: boolean };
    },
    enabled: usuario?.rol === Rol.ADMIN,
    refetchInterval: 15000,
    retry: 0,
  });

  const importStatus: 'ok' | 'warn' | 'error' =
    usuario?.rol !== Rol.ADMIN
      ? 'ok'
      : importHealthQuery.isLoading
        ? 'warn'
        : importHealthQuery.data?.ok
          ? 'ok'
          : 'error';

  const sections = useMemo(() => {
    if (!usuario) return [] as NavSection[];
    const sectionsWithHealth: NavSection[] = fullSections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.href === '/importaciones' ? { ...item, status: importStatus } : item,
      ),
    }));

    return sectionsWithHealth
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessPath(usuario.rol, item.href)),
      }))
      .filter((section) => section.items.length > 0);
  }, [usuario, importStatus]);

  useEffect(() => {
    const readOffset = () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        setSidebarOffset(0);
        return;
      }

      const stored = window.localStorage.getItem('sidebar-collapsed');
      const collapsed = stored === 'true';
      setSidebarOffset(collapsed ? 72 : 260);
    };

    readOffset();

    const onResize = () => readOffset();
    const onCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<{ width: number; mobile: boolean }>;
      setSidebarOffset(custom.detail.mobile ? 0 : custom.detail.width);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('sidebar:offset-change', onCustomEvent as EventListener);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('sidebar:offset-change', onCustomEvent as EventListener);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fcf8fa]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <Sidebar
        sections={sections}
        user={{
          name: `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim() || 'Usuario',
          email: usuario?.email ?? 'usuario@integralcosmeticos.com',
          avatarUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
          role: usuario?.rol ?? 'Sin rol',
        }}
        onNavigate={(href) => {
          if (href === '/logout') {
            logout();
            navigate('/login', { replace: true });
            return;
          }
          navigate(href);
        }}
      />

      <motion.main
        className="min-h-screen flex-1 p-4 md:p-6 lg:p-8"
        animate={{ marginLeft: sidebarOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.main>
    </div>
  );
}
