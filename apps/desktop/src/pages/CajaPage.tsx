import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICierreCaja, IVenta } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const fechaHoy = () => {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
};

async function getCajaActiva(sedeId: string): Promise<ICierreCaja | null> {
  const { data } = await api.get(`/caja/activa/${sedeId}`);
  return data;
}

async function getVentasDia(sedeId: string): Promise<IVenta[]> {
  const { data } = await api.get('/ventas', { params: { sedeId, fecha: fechaHoy() } });
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

// Modal de confirmación propio (sin window.confirm)
function ConfirmModal({ mensaje, esperado, diferencia, onConfirm, onCancel }: {
  mensaje: string; esperado: number; diferencia: number;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4" style={{ backgroundColor: '#2a1709' }}>
          <h3 className="text-lg font-black text-white">Confirmar cierre</h3>
          <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Revisa los datos antes de cerrar</p>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-secondary">{mensaje}</p>
          <div className="p-4 rounded-xl bg-surface-container space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary font-medium">Esperado en caja</span>
              <span className="font-black text-on-secondary-fixed">{cop.format(esperado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary font-medium">Diferencia</span>
              <span className="font-black" style={{ color: diferencia >= 0 ? '#2e7d32' : '#ba1a1a' }}>
                {diferencia >= 0 ? '+' : ''}{cop.format(diferencia)}
              </span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-outline-variant text-secondary hover:bg-surface-container transition-all">
              Cancelar
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all"
              style={{ backgroundColor: '#2a1709' }}>
              Confirmar cierre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CajaPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const setCajaActivaStore = usePosStore((s) => s.setCajaActiva);
  const [montoInicial, setMontoInicial] = useState('0');
  const [montoFinal, setMontoFinal] = useState('0');
  const [showConfirm, setShowConfirm] = useState(false);

  const cajaActivaQuery = useQuery({
    queryKey: ['caja', 'activa', usuario?.sedeId],
    queryFn: () => getCajaActiva(usuario!.sedeId),
    enabled: Boolean(usuario?.sedeId),
  });

  const ventasDiaQuery = useQuery({
    queryKey: ['ventas', 'dia', usuario?.sedeId],
    queryFn: () => getVentasDia(usuario!.sedeId),
    enabled: Boolean(usuario?.sedeId) && Boolean(cajaActivaQuery.data),
  });

  const abrirCajaMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/caja/abrir', { sedeId: usuario?.sedeId, montoInicial: Number(montoInicial) });
      return data;
    },
    onSuccess: (caja) => {
      setCajaActivaStore(caja);
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', usuario?.sedeId] });
    },
  });

  const cerrarCajaMutation = useMutation({
    mutationFn: async () => {
      const caja = cajaActivaQuery.data;
      if (!caja) return null;
      const { data } = await api.post(`/caja/${caja.id}/cerrar`, { montoFinal: Number(montoFinal) });
      return data;
    },
    onSuccess: () => {
      setCajaActivaStore(null);
      setShowConfirm(false);
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', usuario?.sedeId] });
      void queryClient.invalidateQueries({ queryKey: ['ventas', 'dia', usuario?.sedeId] });
    },
  });

  const cajaActiva = cajaActivaQuery.data;

  const esperado = useMemo(() => {
    if (!cajaActiva) return 0;
    return Number(cajaActiva.montoInicial) + Number(cajaActiva.totalEfectivo);
  }, [cajaActiva]);

  const diferencia = Number(montoFinal || 0) - esperado;

  // KPIs ventas del día
  const ventasHoy = ventasDiaQuery.data ?? [];
  const totalVentasDia = ventasHoy.reduce((a, v) => a + Number(v.total), 0);
  const countEfectivo = ventasHoy.filter((v) => v.metodoPago === 'EFECTIVO').length;
  const countTarjeta = ventasHoy.filter((v) => v.metodoPago !== 'EFECTIVO').length;

  return (
    <AppLayout>
      {showConfirm && (
        <ConfirmModal
          mensaje="¿Estás seguro de cerrar la caja? Esta acción no se puede deshacer."
          esperado={esperado}
          diferencia={diferencia}
          onConfirm={() => cerrarCajaMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="space-y-8">
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Caja</h1>
            <p className="text-secondary font-medium mt-1">Apertura, monitoreo y cierre diario</p>
          </div>
          {cajaActiva && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Caja abierta
            </div>
          )}
        </header>

        {cajaActivaQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : !cajaActiva ? (
          /* ── ABRIR CAJA ── */
          <div className="max-w-md">
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5" style={{ backgroundColor: '#2a1709' }}>
                <h2 className="text-xl font-black text-white">Abrir caja</h2>
                <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Ingresa el monto inicial en efectivo</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Monto inicial (COP)</label>
                  <input
                    type="number" min={0} value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-lg font-black text-on-secondary-fixed border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
                <div className="p-4 rounded-xl bg-surface-container">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Monto a registrar</p>
                  <p className="text-2xl font-black text-on-secondary-fixed">{cop.format(Number(montoInicial) || 0)}</p>
                </div>
                <button
                  onClick={() => abrirCajaMutation.mutate()}
                  disabled={abrirCajaMutation.isPending}
                  className="w-full py-4 rounded-xl font-black text-white text-sm uppercase tracking-widest disabled:opacity-60 transition-all"
                  style={{ backgroundColor: '#2a1709' }}>
                  {abrirCajaMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── CAJA ABIERTA ── */
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-primary">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Ventas del día</p>
                <p className="text-2xl font-black text-on-secondary-fixed">{cop.format(totalVentasDia)}</p>
                <p className="text-xs font-bold text-primary mt-2">{ventasHoy.length} transacciones</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl border-l-4" style={{ borderColor: '#2e7d32' }}>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Monto inicial</p>
                <p className="text-2xl font-black text-on-secondary-fixed">{cop.format(Number(cajaActiva.montoInicial))}</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-tertiary">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total efectivo</p>
                <p className="text-2xl font-black text-on-secondary-fixed">{cop.format(Number(cajaActiva.totalEfectivo))}</p>
              </div>
              <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-secondary">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Apertura</p>
                <p className="text-base font-black text-on-secondary-fixed">{new Date(cajaActiva.fechaApertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-secondary mt-1">{new Date(cajaActiva.fechaApertura).toLocaleDateString('es-CO')}</p>
              </div>
            </div>

            {/* Contadores método de pago */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e8f5e9' }}>
                  <span className="material-symbols-outlined" style={{ color: '#2e7d32', fontSize: 24 }}>payments</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest">Ventas efectivo</p>
                  <p className="text-2xl font-black text-on-secondary-fixed">{countEfectivo}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e8eaf6' }}>
                  <span className="material-symbols-outlined" style={{ color: '#3949ab', fontSize: 24 }}>credit_card</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest">Ventas tarjeta/transf.</p>
                  <p className="text-2xl font-black text-on-secondary-fixed">{countTarjeta}</p>
                </div>
              </div>
            </div>

            {/* Tabla ventas del día */}
            <div>
              <h2 className="text-xl font-bold text-on-secondary-fixed mb-4">Ventas del día</h2>
              <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
                {ventasDiaQuery.isLoading ? (
                  <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : ventasHoy.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <span className="material-symbols-outlined text-5xl text-outline">receipt_long</span>
                    <p className="text-sm font-bold text-secondary">Sin ventas registradas hoy</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                        <th className="px-6 py-4">N° Venta</th>
                        <th className="px-6 py-4">Método pago</th>
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {ventasHoy.map((venta, i) => (
                        <tr key={venta.id} className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                          <td className="px-6 py-4 font-bold text-on-surface">{venta.numero}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold"
                              style={venta.metodoPago === 'EFECTIVO'
                                ? { backgroundColor: '#e8f5e9', color: '#2e7d32' }
                                : { backgroundColor: '#e8eaf6', color: '#3949ab' }}>
                              {venta.metodoPago}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-on-surface">{cop.format(Number(venta.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Cierre de caja */}
            <div className="max-w-lg">
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5" style={{ backgroundColor: '#2a1709' }}>
                  <h2 className="text-xl font-black text-white">Cerrar caja</h2>
                  <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Ingresa el conteo físico de efectivo</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Monto contado en caja (COP)</label>
                    <input
                      type="number" min={0} value={montoFinal}
                      onChange={(e) => setMontoFinal(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-lg font-black text-on-secondary-fixed border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-surface-container">
                      <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Esperado</p>
                      <p className="text-lg font-black text-on-secondary-fixed">{cop.format(esperado)}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{
                      backgroundColor: diferencia >= 0 ? '#e8f5e9' : '#ffdad6',
                    }}>
                      <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Diferencia</p>
                      <p className="text-lg font-black" style={{ color: diferencia >= 0 ? '#2e7d32' : '#ba1a1a' }}>
                        {diferencia >= 0 ? '+' : ''}{cop.format(diferencia)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-4 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all"
                    style={{ backgroundColor: '#85264b' }}>
                    Cerrar caja
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
