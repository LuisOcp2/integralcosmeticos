import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

interface SyncLogItem {
  id: string;
  tabla: string;
  estado: 'OK' | 'ERROR';
  registrosAfectados: number;
  creadoEn: string;
}

interface SyncStatusResponse {
  pendientes: number;
  completados: number;
  errores: number;
  ultimaSync: string | null;
  historial: SyncLogItem[];
}

async function getSyncStatus(): Promise<SyncStatusResponse> {
  const { data } = await api.get('/sync/status');
  return data;
}

async function forzarSync() {
  const { data } = await api.post('/sync/forzar');
  return data;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

export default function SyncPage() {
  const queryClient = useQueryClient();
  const [desktopEvent, setDesktopEvent] = useState<string | null>(null);

  const syncStatusQuery = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: getSyncStatus,
    refetchInterval: 30000,
  });

  const forzarSyncMutation = useMutation({
    mutationFn: forzarSync,
    onSuccess: async () => {
      if (window.electronAPI?.notifySyncRefresh) await window.electronAPI.notifySyncRefresh();
      await queryClient.invalidateQueries({ queryKey: ['sync', 'status'] });
    },
  });

  useEffect(() => {
    const off = window.electronAPI?.onSyncStatus?.((payload) => {
      const event = payload as { type?: string };
      if (event.type) setDesktopEvent(event.type);
      void queryClient.invalidateQueries({ queryKey: ['sync', 'status'] });
    });
    return () => { off?.(); };
  }, [queryClient]);

  const status = syncStatusQuery.data;

  const estadoGlobal = status?.errores && status.errores > 0
    ? { label: 'Con errores', icon: 'error', bg: '#ffdad6', color: '#ba1a1a', border: '#ba1a1a' }
    : status?.pendientes && status.pendientes > 0
      ? { label: 'Pendiente', icon: 'schedule', bg: '#fff3e0', color: '#e65100', border: '#e65100' }
      : { label: 'Sincronizado', icon: 'cloud_done', bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Sincronización</h1>
            <p className="text-secondary font-medium mt-1">Estado en tiempo real de la cola cloud</p>
          </div>
          <button
            onClick={() => forzarSyncMutation.mutate()}
            disabled={forzarSyncMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white uppercase tracking-widest disabled:opacity-60 transition-all"
            style={{ backgroundColor: '#2a1709' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {forzarSyncMutation.isPending ? 'hourglass_top' : 'sync'}
            </span>
            {forzarSyncMutation.isPending ? 'Sincronizando...' : 'Forzar sync ahora'}
          </button>
        </header>

        {/* Estado global */}
        <div className="rounded-2xl p-6 border-l-4 flex items-center gap-5"
          style={{ backgroundColor: estadoGlobal.bg, borderColor: estadoGlobal.border }}>
          <span className="material-symbols-outlined text-5xl" style={{ color: estadoGlobal.color, fontVariationSettings: "'FILL' 1" }}>
            {estadoGlobal.icon}
          </span>
          <div>
            <p className="text-xl font-black" style={{ color: estadoGlobal.color }}>{estadoGlobal.label}</p>
            {status?.ultimaSync ? (
              <p className="text-sm text-secondary mt-0.5">Última sync: {formatFecha(status.ultimaSync)}</p>
            ) : (
              <p className="text-sm text-secondary mt-0.5">Sin sincronizaciones recientes</p>
            )}
            {desktopEvent && (
              <p className="text-xs text-secondary mt-1">Último evento desktop: <span className="font-bold">{desktopEvent}</span></p>
            )}
          </div>
        </div>

        {/* KPIs */}
        {syncStatusQuery.isLoading ? (
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Completados</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{status?.completados ?? 0}</p>
            </div>
            <div className="p-6 rounded-2xl border-l-4" style={{ backgroundColor: '#fff3e0', borderColor: '#e65100' }}>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Pendientes</p>
              <p className="text-2xl font-black" style={{ color: '#e65100' }}>{status?.pendientes ?? 0}</p>
            </div>
            <div className="p-6 rounded-2xl border-l-4" style={{ backgroundColor: '#ffdad6', borderColor: '#ba1a1a' }}>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Errores</p>
              <p className="text-2xl font-black" style={{ color: '#ba1a1a' }}>{status?.errores ?? 0}</p>
            </div>
          </div>
        )}

        {/* Historial */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-on-secondary-fixed">Historial de sincronizaciones</h2>
            {syncStatusQuery.isFetching && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Actualizando...
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
            {syncStatusQuery.isLoading ? (
              <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !status?.historial?.length ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-5xl text-outline">history</span>
                <p className="text-sm font-bold text-secondary">Sin registros de sincronización</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                    <th className="px-6 py-4">Tabla</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Registros</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {status.historial.map((item, i) => (
                    <tr key={item.id} className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                      <td className="px-6 py-4 font-bold text-on-surface">{item.tabla}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold"
                          style={item.estado === 'OK'
                            ? { backgroundColor: '#e8f5e9', color: '#2e7d32' }
                            : { backgroundColor: '#ffdad6', color: '#ba1a1a' }}>
                          {item.estado === 'OK' ? '✓ OK' : '✗ ERROR'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-secondary">{formatFecha(item.creadoEn)}</td>
                      <td className="px-6 py-4 text-right font-black text-on-surface">{item.registrosAfectados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
