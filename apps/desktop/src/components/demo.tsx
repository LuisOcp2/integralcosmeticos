'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './ui/sidebar';

function useDesktopSidebarOffset(): number {
  const [offset, setOffset] = React.useState(260);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const readOffset = () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        setOffset(0);
        return;
      }

      const stored = window.localStorage.getItem('sidebar-collapsed');
      const collapsed = stored === 'true';
      setOffset(collapsed ? 72 : 260);
    };

    readOffset();

    const onResize = () => readOffset();
    const onCustomEvent = (event: Event) => {
      const custom = event as CustomEvent<{ width: number; mobile: boolean }>;
      setOffset(custom.detail.mobile ? 0 : custom.detail.width);
    };
    const onStorage = () => readOffset();

    window.addEventListener('resize', onResize);
    window.addEventListener('sidebar:offset-change', onCustomEvent as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('sidebar:offset-change', onCustomEvent as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return offset;
}

export default function Demo() {
  const sidebarOffset = useDesktopSidebarOffset();

  return (
    <div className="flex h-screen bg-[#f5efeb]">
      <Sidebar />

      <motion.main
        className="flex-1 p-6 md:p-10"
        animate={{ marginLeft: sidebarOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="h-full rounded-2xl border border-[#d9c9bf] bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-semibold text-[#2a1709] md:text-3xl">Panel Principal</h1>
          <p className="mt-2 text-sm text-[#5e4332] md:text-base">
            Este es un contenedor de contenido de ejemplo. En desktop se desplaza con margen
            izquierdo animado cuando el sidebar cambia entre expandido y colapsado.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {['Ventas del día', 'Inventario bajo', 'Clientes activos'].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#eadfd8] bg-[#fffaf8] p-4 text-[#3d2416]"
              >
                <h2 className="text-sm font-medium">{item}</h2>
                <p className="mt-1 text-2xl font-semibold">+24%</p>
              </div>
            ))}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
