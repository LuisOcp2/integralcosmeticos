import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IProductoMasVendido,
  IResumenVentasDia,
  IStockReporte,
  ISede,
  Rol,
} from '@cosmeticos/shared-types';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import AppLayout from './components/AppLayout';

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });

const pieColors: Record<string, string> = {
  EFECTIVO: '#6366f1',
  TARJETA_CREDITO: '#f59e0b',
  TARJETA_DEBITO: '#10b981',
  TRANSFERENCIA: '#3b82f6',
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year.slice(2)}`;
};

const formatChartDate = (isoDate: string) => {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
};

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

async function getResumenVentasDia(sedeId: string, fecha: string): Promise<IResumenVentasDia> {
  const { data } = await api.get('/reportes/ventas-dia', { params: { sedeId, fecha } });
  return data;
}

async function getProductosMasVendidosSemana(
  sedeId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<IProductoMasVendido[]> {
  const { data } = await api.get('/reportes/productos-mas-vendidos', {
    params: { sedeId, fechaInicio, fechaFin, limit: 5 },
  });
  return data;
}

async function getStockBajo(sedeId: string): Promise<IStockReporte[]> {
  const { data } = await api.get('/reportes/stock-bajo', { params: { sedeId } });
  return data;
}

async function getVentasDiaRaw(sedeId: string, fecha: string) {
  const { data } = await api.get('/ventas', { params: { sedeId, fecha } });
  return data as Array<{ clienteId?: string | null }>;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-rose-100/70 ${className}`} />;
}

export default function DashboardPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const weekStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return toISODate(date);
  }, [today]);

  const sedesQuery = useQuery({
    queryKey: ['dashboard', 'sedes', usuario?.rol],
    queryFn: getSedes,
    enabled: usuario?.rol === Rol.ADMIN,
    refetchInterval: 60000,
  });

  const sedesDisponibles = useMemo(() => {
    if (!usuario) {
      return [] as Array<{ id: string; nombre: string }>;
    }
    if (usuario.rol === Rol.ADMIN) {
      return (sedesQuery.data ?? []).map((sede) => ({ id: sede.id, nombre: sede.nombre }));
    }
    return usuario.sedeId ? [{ id: usuario.sedeId, nombre: 'Mi sede' }] : [];
  }, [sedesQuery.data, usuario]);

  const [selectedSedeId, setSelectedSedeId] = useState<string>(usuario?.sedeId ?? '');

  const effectiveSedeId = selectedSedeId || usuario?.sedeId || sedesDisponibles[0]?.id || '';

  const resumenHoyQuery = useQuery({
    queryKey: ['dashboard', 'resumen-hoy', effectiveSedeId, todayISO],
    queryFn: () => getResumenVentasDia(effectiveSedeId, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const ventas7DiasQuery = useQuery({
    queryKey: ['dashboard', 'ventas-7-dias', effectiveSedeId, todayISO],
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
    queryFn: async () => {
      const dates = Array.from({ length: 7 }).map((_, index) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - index));
        return toISODate(d);
      });

      const values = await Promise.all(
        dates.map(async (fecha) => {
          const resumen = await getResumenVentasDia(effectiveSedeId, fecha);
          return {
            fecha,
            total: resumen.totalVentas,
          };
        }),
      );

      return values;
    },
  });

  const topProductosQuery = useQuery({
    queryKey: ['dashboard', 'top-productos', effectiveSedeId, weekStart, todayISO],
    queryFn: () => getProductosMasVendidosSemana(effectiveSedeId, weekStart, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const stockBajoQuery = useQuery({
    queryKey: ['dashboard', 'stock-bajo', effectiveSedeId],
    queryFn: () => getStockBajo(effectiveSedeId),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const clientesAtendidosQuery = useQuery({
    queryKey: ['dashboard', 'clientes-atendidos', effectiveSedeId, todayISO],
    queryFn: () => getVentasDiaRaw(effectiveSedeId, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const lineData = useMemo(
    () =>
      (ventas7DiasQuery.data ?? []).map((row) => ({
        fecha: formatChartDate(row.fecha),
        total: row.total,
      })),
    [ventas7DiasQuery.data],
  );

  const pieData = useMemo(
    () =>
      (resumenHoyQuery.data?.desglosePorMetodoPago ?? []).map((item) => ({
        name: item.metodoPago,
        value: item.total,
      })),
    [resumenHoyQuery.data],
  );

  const clientesAtendidos = useMemo(() => {
    const unique = new Set(
      (clientesAtendidosQuery.data ?? []).map((venta) => venta.clienteId).filter(Boolean),
    );
    return unique.size;
  }, [clientesAtendidosQuery.data]);

  const isLoadingKpis =
    resumenHoyQuery.isLoading || stockBajoQuery.isLoading || clientesAtendidosQuery.isLoading;

  return (
    <AppLayout>
      <div className="space-y-4">
        <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-indigo-900">Dashboard de inteligencia</h1>
              <p className="text-sm text-indigo-700/70">Actualizacion automatica cada minuto.</p>
            </div>
            <div className="w-full md:w-72">
              <label className="mb-1 block text-xs uppercase tracking-wide text-indigo-800">
                Sede
              </label>
              <select
                value={effectiveSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                disabled={usuario?.rol !== Rol.ADMIN}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm text-indigo-900"
              >
                {sedesDisponibles.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-sm text-emerald-700">💰 Ventas de hoy</p>
            {isLoadingKpis ? (
              <SkeletonBlock className="mt-2 h-8 w-40" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {copFormatter.format(resumenHoyQuery.data?.totalVentas ?? 0)}
              </p>
            )}
          </article>

          <article className="rounded-xl border border-sky-100 bg-sky-50 p-4 shadow-sm">
            <p className="text-sm text-sky-700">🧾 Transacciones del dia</p>
            {isLoadingKpis ? (
              <SkeletonBlock className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-sky-900">
                {resumenHoyQuery.data?.cantidadTransacciones ?? 0}
              </p>
            )}
          </article>

          <article className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm text-amber-700">📦 Productos bajo minimo</p>
            {isLoadingKpis ? (
              <SkeletonBlock className="mt-2 h-8 w-24" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-semibold text-amber-900">
                  {stockBajoQuery.data?.length ?? 0}
                </p>
                {(stockBajoQuery.data?.length ?? 0) > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Alerta
                  </span>
                )}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-violet-100 bg-violet-50 p-4 shadow-sm">
            <p className="text-sm text-violet-700">👥 Clientes atendidos hoy</p>
            {isLoadingKpis ? (
              <SkeletonBlock className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-violet-900">{clientesAtendidos}</p>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-indigo-900">Ventas ultimos 7 dias</h2>
          {ventas7DiasQuery.isLoading ? (
            <SkeletonBlock className="h-72 w-full" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis tickFormatter={(value) => copFormatter.format(value)} />
                  <Tooltip formatter={(value) => copFormatter.format(Number(value ?? 0))} />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-medium text-emerald-900">Top 5 productos (semana)</h2>
            {topProductosQuery.isLoading ? (
              <SkeletonBlock className="h-72 w-full" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <BarChart data={topProductosQuery.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalUnidades" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-medium text-indigo-900">Ventas por metodo de pago</h2>
            {resumenHoyQuery.isLoading ? (
              <SkeletonBlock className="h-72 w-full" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={pieColors[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => copFormatter.format(Number(value ?? 0))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-lg font-medium text-amber-900">Productos bajo stock minimo</h2>
          </div>

          {stockBajoQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-9 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-900">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Variante</th>
                  <th className="px-4 py-3 text-left">Sede</th>
                  <th className="px-4 py-3 text-left">Stock Actual</th>
                  <th className="px-4 py-3 text-left">Minimo</th>
                  <th className="px-4 py-3 text-left">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {(stockBajoQuery.data ?? []).map((item) => {
                  const diferencia = item.stockMinimo - item.cantidad;
                  return (
                    <tr
                      key={`${item.sedeId}-${item.varianteId}`}
                      className="border-t border-amber-100"
                    >
                      <td className="px-4 py-3">{item.nombreProducto}</td>
                      <td className="px-4 py-3">{item.nombreVariante}</td>
                      <td className="px-4 py-3">{item.sedeId}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.cantidad === 0
                              ? 'bg-red-100 text-red-700'
                              : item.cantidad <= item.stockMinimo / 2
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.cantidad}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.stockMinimo}</td>
                      <td className="px-4 py-3">-{diferencia}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
          Ultima actualizacion: {formatShortDate(todayISO)}
        </section>
      </div>
    </AppLayout>
  );
}
