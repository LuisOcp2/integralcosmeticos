import { useQuery } from '@tanstack/react-query';
import { ISede } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

const tipoColor: Record<string, { bg: string; color: string }> = {
  PRINCIPAL: { bg: '#ffd9e1', color: '#85264b' },
  SUCURSAL: { bg: '#e8eaf6', color: '#3949ab' },
  BODEGA:   { bg: '#fff3e0', color: '#e65100' },
};

export default function SedesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sedes'],
    queryFn: getSedes,
    refetchInterval: 60000,
  });

  const sedes = data ?? [];
  const activas = sedes.filter((s) => s.activa !== false).length;

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Sedes</h1>
            <p className="text-secondary font-medium mt-1">Puntos de venta y bodegas registrados</p>
          </div>
        </header>

        {/* KPIs */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total sedes</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{sedes.length}</p>
            </div>
            <div className="p-5 rounded-2xl border-l-4" style={{ backgroundColor: '#e8f5e9', borderColor: '#2e7d32' }}>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Sedes activas</p>
              <p className="text-2xl font-black" style={{ color: '#2e7d32' }}>{activas}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-secondary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Ciudades</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{new Set(sedes.map((s) => s.ciudad)).size}</p>
            </div>
          </div>
        )}

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <p className="text-sm font-bold text-secondary">No fue posible cargar las sedes</p>
          </div>
        ) : sedes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
            <span className="material-symbols-outlined text-5xl text-outline">location_on</span>
            <p className="text-sm font-bold text-secondary">No hay sedes registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedes.map((sede) => {
              const tc = tipoColor[sede.tipo] ?? { bg: '#f5f5f5', color: '#546e7a' };
              return (
                <div key={sede.id} className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
                  <div className="p-5" style={{ backgroundColor: '#2a1709' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">{sede.nombre}</h3>
                        <p className="text-sm" style={{ color: '#fba9e5' }}>{sede.ciudad}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black" style={{ backgroundColor: tc.bg, color: tc.color }}>
                        {sede.tipo}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>location_on</span>
                      <p className="text-sm text-secondary">{sede.direccion}</p>
                    </div>
                    {sede.telefono && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>phone</span>
                        <p className="text-sm text-secondary">{sede.telefono}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sede.activa !== false ? '#2e7d32' : '#ba1a1a' }} />
                        <span className="text-xs font-bold" style={{ color: sede.activa !== false ? '#2e7d32' : '#ba1a1a' }}>
                          {sede.activa !== false ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <span className="text-xs text-secondary font-medium">ID: {sede.id.slice(0, 8)}…</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
