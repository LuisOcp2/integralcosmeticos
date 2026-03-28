import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICierreCaja, IVenta } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const S = {
  primary: '#85264b',
  accent: '#a43e63',
  textStrong: '#2a1709',
  textMuted: '#735946',
  surface: '#f1edef',
  card: '#FFFFFF',
  border: '#dac0c5',
  success: '#2e7d32',
  successBg: '#e8f5e9',
  info: '#3949ab',
  infoBg: '#e8eaf6',
  warning: '#e65100',
  warningBg: '#fff8e1',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  panel: '#fcf8fa',
  panelSoft: '#ebe7e9',
  backdrop: 'rgba(46, 27, 12, 0.5)',
  heroFrom: '#fcf8fa',
  heroVia: '#f6f2f4',
  heroTo: '#f1edef',
};

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
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ backgroundColor: S.surface }}
    />
  );
}

// Modal de confirmación propio (sin window.confirm)
function ConfirmModal({
  mensaje,
  esperado,
  diferencia,
  onConfirm,
  onCancel,
}: {
  mensaje: string;
  esperado: number;
  diferencia: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
      style={{ backgroundColor: S.backdrop }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: S.card }}
      >
        <div className="px-6 py-4" style={{ backgroundColor: S.textStrong }}>
          <h3 className="text-lg font-black text-white">Confirmar cierre</h3>
          <p className="text-sm mt-0.5" style={{ color: '#BFDBFE' }}>
            Revisa los datos antes de cerrar
          </p>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm" style={{ color: S.textMuted }}>
            {mensaje}
          </p>
          <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: S.surface }}>
            <div className="flex justify-between text-sm">
              <span className="font-medium" style={{ color: S.textMuted }}>
                Esperado en caja
              </span>
              <span className="font-black" style={{ color: S.textStrong }}>
                {cop.format(esperado)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium" style={{ color: S.textMuted }}>
                Diferencia
              </span>
              <span
                className="font-black"
                style={{ color: diferencia >= 0 ? S.success : S.danger }}
              >
                {diferencia >= 0 ? '+' : ''}
                {cop.format(diferencia)}
              </span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all"
              style={{ borderColor: S.border, color: S.textMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 flex-1 rounded-xl py-3 text-sm font-black text-white transition-all"
              style={{ backgroundColor: S.textStrong }}
            >
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
      const { data } = await api.post('/caja/abrir', {
        sedeId: usuario?.sedeId,
        montoInicial: Number(montoInicial),
      });
      return data;
    },
    onSuccess: (caja) => {
      setCajaActivaStore(caja);
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', usuario?.sedeId] });
    },
  });

  const cerrarCajaMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/caja/cierre', {
        sedeId: usuario?.sedeId,
        montoFinal: Number(montoFinal),
      });
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
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: S.textStrong }}>
              Caja
            </h1>
            <p className="mt-1 font-medium" style={{ color: S.textMuted }}>
              Apertura, monitoreo y cierre diario
            </p>
          </div>
          {cajaActiva && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: S.successBg, color: S.success }}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Caja abierta
            </div>
          )}
        </header>

        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: S.border,
            background: `linear-gradient(135deg, ${S.heroFrom} 0%, ${S.heroVia} 52%, ${S.heroTo} 100%)`,
          }}
        >
          <p
            className="text-xs font-extrabold uppercase tracking-[0.18em]"
            style={{ color: S.textMuted }}
          >
            Control de Caja
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: S.textStrong }}>
            Monitorea ventas, efectivo y cierre con arqueo del turno
          </p>
        </div>

        {cajaActivaQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !cajaActiva ? (
          /* ── ABRIR CAJA ── */
          <div className="max-w-md">
            <div
              className="overflow-hidden rounded-2xl border shadow-sm"
              style={{ backgroundColor: S.card, borderColor: S.border }}
            >
              <div
                className="px-6 py-5"
                style={{
                  background: `linear-gradient(135deg, ${S.heroFrom} 0%, ${S.heroVia} 52%, ${S.heroTo} 100%)`,
                }}
              >
                <h2 className="text-xl font-black" style={{ color: S.textStrong }}>
                  Abrir caja
                </h2>
                <p className="text-sm mt-0.5" style={{ color: S.textMuted }}>
                  Ingresa el monto inicial en efectivo
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label
                    className="mb-2 block text-xs font-bold uppercase tracking-widest"
                    style={{ color: S.textMuted }}
                  >
                    Monto inicial (COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full rounded-xl border-2 px-4 py-3 text-lg font-black transition-colors focus:outline-none"
                    style={{ borderColor: S.border, backgroundColor: S.panel, color: S.textStrong }}
                    placeholder="0"
                  />
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: S.surface }}>
                  <p
                    className="mb-1 text-xs font-bold uppercase tracking-widest"
                    style={{ color: S.textMuted }}
                  >
                    Monto a registrar
                  </p>
                  <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                    {cop.format(Number(montoInicial) || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirCajaMutation.mutate()}
                  disabled={abrirCajaMutation.isPending}
                  className="min-h-11 w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: S.primary }}
                >
                  {abrirCajaMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── CAJA ABIERTA ── */
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <div
                className="rounded-2xl border-l-4 p-6"
                style={{ backgroundColor: S.card, borderLeftColor: S.primary }}
              >
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: S.textMuted }}
                >
                  Ventas del día
                </p>
                <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                  {cop.format(totalVentasDia)}
                </p>
                <p className="mt-2 text-xs font-bold" style={{ color: S.primary }}>
                  {ventasHoy.length} transacciones
                </p>
              </div>
              <div
                className="rounded-2xl border-l-4 p-6"
                style={{ backgroundColor: S.card, borderLeftColor: S.success }}
              >
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: S.textMuted }}
                >
                  Monto inicial
                </p>
                <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                  {cop.format(Number(cajaActiva.montoInicial))}
                </p>
              </div>
              <div
                className="rounded-2xl border-l-4 p-6"
                style={{ backgroundColor: S.card, borderLeftColor: S.accent }}
              >
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: S.textMuted }}
                >
                  Total efectivo
                </p>
                <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                  {cop.format(Number(cajaActiva.totalEfectivo))}
                </p>
              </div>
              <div
                className="rounded-2xl border-l-4 p-6"
                style={{ backgroundColor: S.card, borderLeftColor: S.info }}
              >
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: S.textMuted }}
                >
                  Apertura
                </p>
                <p className="text-base font-black" style={{ color: S.textStrong }}>
                  {new Date(cajaActiva.fechaApertura).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-1 text-xs" style={{ color: S.textMuted }}>
                  {new Date(cajaActiva.fechaApertura).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>

            {/* Contadores método de pago */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                className="flex items-center gap-4 rounded-2xl border p-4"
                style={{ backgroundColor: S.card, borderColor: S.border }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: S.successBg }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: S.success, fontSize: 24 }}
                  >
                    payments
                  </span>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: S.textMuted }}
                  >
                    Ventas efectivo
                  </p>
                  <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                    {countEfectivo}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-4 rounded-2xl border p-4"
                style={{ backgroundColor: S.card, borderColor: S.border }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: S.infoBg }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: S.info, fontSize: 24 }}
                  >
                    credit_card
                  </span>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: S.textMuted }}
                  >
                    Ventas tarjeta/transf.
                  </p>
                  <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                    {countTarjeta}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla ventas del día */}
            <div>
              <h2 className="mb-4 text-xl font-bold" style={{ color: S.textStrong }}>
                Ventas del día
              </h2>
              <div
                className="overflow-x-auto rounded-2xl border shadow-sm"
                style={{ borderColor: S.border, backgroundColor: S.card }}
              >
                {ventasDiaQuery.isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : ventasHoy.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <span
                      className="material-symbols-outlined text-5xl"
                      style={{ color: S.border }}
                    >
                      receipt_long
                    </span>
                    <p className="text-sm font-bold" style={{ color: S.textMuted }}>
                      Sin ventas registradas hoy
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ backgroundColor: S.surface, color: S.textMuted }}
                      >
                        <th className="px-6 py-4">N° Venta</th>
                        <th className="px-6 py-4">Método pago</th>
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {ventasHoy.map((venta, i) => (
                        <tr
                          key={venta.id}
                          style={{
                            borderBottom: `1px solid ${S.border}`,
                            backgroundColor: i % 2 === 0 ? S.card : S.panel,
                          }}
                        >
                          <td className="px-6 py-4 font-bold" style={{ color: S.textStrong }}>
                            {venta.numero}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={
                                venta.metodoPago === 'EFECTIVO'
                                  ? { backgroundColor: S.successBg, color: S.success }
                                  : { backgroundColor: S.infoBg, color: S.info }
                              }
                            >
                              {venta.metodoPago}
                            </span>
                          </td>
                          <td
                            className="px-6 py-4 text-right font-bold"
                            style={{ color: S.textStrong }}
                          >
                            {cop.format(Number(venta.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Cierre de caja */}
            <div className="max-w-lg">
              <div
                className="overflow-hidden rounded-2xl border shadow-sm"
                style={{ backgroundColor: S.card, borderColor: S.border }}
              >
                <div
                  className="px-6 py-5"
                  style={{
                    background: `linear-gradient(135deg, ${S.heroFrom} 0%, ${S.heroVia} 52%, ${S.heroTo} 100%)`,
                  }}
                >
                  <h2 className="text-xl font-black" style={{ color: S.textStrong }}>
                    Cerrar caja
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: S.textMuted }}>
                    Ingresa el conteo físico de efectivo
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label
                      className="mb-2 block text-xs font-bold uppercase tracking-widest"
                      style={{ color: S.textMuted }}
                    >
                      Monto contado en caja (COP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={montoFinal}
                      onChange={(e) => setMontoFinal(e.target.value)}
                      className="w-full rounded-xl border-2 px-4 py-3 text-lg font-black transition-colors focus:outline-none"
                      style={{
                        borderColor: S.border,
                        backgroundColor: S.panel,
                        color: S.textStrong,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl p-4" style={{ backgroundColor: S.surface }}>
                      <p
                        className="mb-1 text-xs font-bold uppercase tracking-widest"
                        style={{ color: S.textMuted }}
                      >
                        Esperado
                      </p>
                      <p className="text-lg font-black" style={{ color: S.textStrong }}>
                        {cop.format(esperado)}
                      </p>
                    </div>
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        backgroundColor: diferencia >= 0 ? S.successBg : S.dangerBg,
                      }}
                    >
                      <p
                        className="mb-1 text-xs font-bold uppercase tracking-widest"
                        style={{ color: S.textMuted }}
                      >
                        Diferencia
                      </p>
                      <p
                        className="text-lg font-black"
                        style={{ color: diferencia >= 0 ? S.success : S.danger }}
                      >
                        {diferencia >= 0 ? '+' : ''}
                        {cop.format(diferencia)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="min-h-11 w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all"
                    style={{ backgroundColor: S.primary }}
                  >
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
