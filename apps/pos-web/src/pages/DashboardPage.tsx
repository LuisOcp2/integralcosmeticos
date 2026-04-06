import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Box,
  ChartLine,
  ClipboardList,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSedes } from '@/hooks/useSedes';
import type { DashboardReport } from '@/modules/reportes/api/reportes.api';

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const formatFechaLarga = (date: Date) =>
  new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

const formatFechaCorta = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-surface-2 ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta: number }) {
  const positive = delta >= 0;
  const ArrowIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-2xl border border-outline-variant bg-surface p-4">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-2 text-2xl font-black text-on-background">{value}</p>
      <div
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
          positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}
      >
        <ArrowIcon className="h-3.5 w-3.5" />
        <span>
          {positive ? '+' : ''}
          {delta.toFixed(2)}% vs periodo anterior
        </span>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sedes = [] } = useSedes();
  const isAdmin = user?.rol === 'ADMIN';
  const [selectedSedeId, setSelectedSedeId] = useState<string>(user?.sedeId ?? '');

  useEffect(() => {
    if (!isAdmin) {
      setSelectedSedeId(user?.sedeId ?? '');
    }
  }, [isAdmin, user?.sedeId]);

  const sedeId = selectedSedeId || undefined;

  const sedeActiva = useMemo(() => {
    if (!sedeId) return 'Todas las sedes';
    return sedes.find((s) => s.id === sedeId)?.nombre ?? 'Sede activa';
  }, [sedeId, sedes]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', sedeId ?? 'global'],
    queryFn: async () => {
      const api = apiClient;
      const response = await api.get<DashboardReport>('/reportes/dashboard', {
        params: sedeId ? { sedeId } : undefined,
      });
      return response.data;
    },
    refetchInterval: 120000,
  });

  const dashboard = dashboardQuery.data;
  const lineData = (dashboard?.resumenMes.ventasPorDia ?? []).map((item) => ({
    ...item,
    label: formatFechaCorta(item.fecha),
  }));

  const quickActions = [
    { label: 'Ventas', icon: ShoppingBag, to: '/pos' },
    { label: 'Inventario', icon: Box, to: '/reportes' },
    { label: 'CRM', icon: Users, to: '/clientes' },
    { label: 'Reportes', icon: ClipboardList, to: '/reportes' },
    { label: 'Caja', icon: Wallet, to: '/caja' },
    { label: 'Clientes', icon: Users, to: '/clientes' },
  ];

  if (dashboardQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <Shimmer className="h-24 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-36 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Shimmer className="h-96 xl:col-span-2" />
            <Shimmer className="h-96" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Shimmer className="h-80" />
            <Shimmer className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl rounded-2xl border border-error/40 bg-error/10 p-5 text-error">
          No se pudo cargar el dashboard ejecutivo.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-outline-variant bg-surface p-5">
          <p className="text-sm capitalize text-on-surface-variant">
            {formatFechaLarga(new Date())}
          </p>
          <h1 className="mt-1 text-2xl font-black text-on-background">Dashboard ejecutivo</h1>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-on-surface-variant">
              Usuario:{' '}
              <span className="font-semibold text-on-background">
                {`${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() || user?.email}
              </span>{' '}
              | Sede activa: <span className="font-semibold text-on-background">{sedeActiva}</span>
            </p>
            <div className="w-full md:w-72">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Filtrar por sede
              </label>
              <select
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                disabled={!isAdmin}
                className="h-10 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-background disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAdmin ? <option value="">Todas las sedes</option> : null}
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Ventas hoy"
            value={formatCOP(dashboard.resumenHoy.totalVentas)}
            delta={dashboard.resumenHoy.diferenciaVsAyerPct}
          />
          <KpiCard
            label="Transacciones"
            value={String(dashboard.resumenHoy.transacciones)}
            delta={dashboard.resumenHoy.diferenciaVsAyerPct}
          />
          <KpiCard
            label="Ticket promedio"
            value={formatCOP(dashboard.resumenHoy.ticketPromedio)}
            delta={dashboard.resumenHoy.diferenciaVsAyerPct}
          />
          <KpiCard
            label="Valor inventario"
            value={formatCOP(dashboard.inventario.valorTotalInventario)}
            delta={-Math.min(100, dashboard.inventario.stockBajoMinimo)}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-outline-variant bg-surface p-4 xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <ChartLine className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold text-on-background">Ventas del mes</h2>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e7dbe0" />
                  <XAxis dataKey="label" stroke="#7f626d" />
                  <YAxis stroke="#7f626d" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCOP(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8b284e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-outline-variant bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold text-on-background">Alertas</h2>
            </div>
            <ul className="space-y-3">
              {dashboard.alertas.length === 0 ? (
                <li className="rounded-xl bg-surface-2 p-3 text-sm text-on-surface-variant">
                  Sin alertas activas.
                </li>
              ) : (
                dashboard.alertas.map((alerta) => (
                  <li
                    key={`${alerta.tipo}-${alerta.mensaje}`}
                    className="rounded-xl border border-outline-variant p-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 ${
                          alerta.prioridad === 'alta' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-on-background">{alerta.mensaje}</p>
                        <button
                          type="button"
                          onClick={() => navigate(alerta.accion.ruta)}
                          className="mt-2 text-xs font-semibold text-primary hover:underline"
                        >
                          {alerta.accion.label}
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Top 5 productos hoy</h2>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-2 py-2">Producto</th>
                    <th className="px-2 py-2">Cantidad</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topProductosHoy.length === 0 ? (
                    <tr className="border-t border-outline-variant">
                      <td className="px-2 py-3 text-sm text-on-surface-variant" colSpan={3}>
                        Sin ventas registradas hoy.
                      </td>
                    </tr>
                  ) : (
                    dashboard.topProductosHoy.map((item) => (
                      <tr key={item.productoId} className="border-t border-outline-variant">
                        <td className="px-2 py-2 text-on-background">{item.producto}</td>
                        <td className="px-2 py-2 text-on-surface-variant">{item.cantidad}</td>
                        <td className="px-2 py-2 text-right font-semibold text-on-background">
                          {formatCOP(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Accesos rapidos</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.to)}
                    className="rounded-xl border border-outline-variant bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-sm font-semibold text-on-background">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
