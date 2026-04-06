import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ISede, Rol } from '@cosmeticos/shared-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const dashboardTheme = {
  textStrong: '#2E1B0C',
  textMuted: '#735946',
  textSoft: '#785d4a',
  border: '#eadfe3',
  borderSoft: '#f1edef',
  bgSoft: '#f6f2f4',
  cardBg: '#ffffff',
  accent: '#A43E63',
  accentSoft: '#FBA9E5',
  dangerBg: '#ffdad6',
  dangerText: '#93000a',
  warningBg: '#ffdcc4',
  warningText: '#5a4230',
};

const pieColors: Record<string, string> = {
  EFECTIVO: '#735946',
  TARJETA_CREDITO: '#85264b',
  TARJETA_DEBITO: '#A43E63',
  TRANSFERENCIA: '#733266',
};

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatChartDate = (isoDate: string) => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const [y, m, d] = isoDate.split('-').map(Number);
  return days[new Date(y, m - 1, d).getDay()];
};

const isUuidV4 = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

type VentasResumen = {
  totalVentas: number;
  montoTotal: number;
  ticketPromedio: number;
  porMetodoPago: Array<{ metodoPago: string; cantidad: number; montoTotal: number }>;
};

type VentasPorDia = {
  serie: Array<{ fecha: string; totalVentas: number; montoTotal: number }>;
};

type ProductosMasVendidos = {
  porCantidad: Array<{
    productoId: string;
    nombre: string;
    cantidadVendida: number;
    montoTotal: number;
  }>;
};

type InventarioAlertas = {
  alertas: Array<{
    stockId: string;
    producto: string;
    variante: string;
    stockActual: number;
    stockMinimo: number;
    deficit: number;
  }>;
};

async function getResumenVentasDia(
  sedeId: string | undefined,
  fecha: string,
): Promise<VentasResumen> {
  const { data } = await api.get('/reportes/ventas/resumen', {
    params: {
      ...(sedeId ? { sedeId } : {}),
      fechaDesde: fecha,
      fechaHasta: fecha,
    },
  });
  return data;
}

async function getVentasPorDia(
  sedeId: string | undefined,
  fechaDesde: string,
  fechaHasta: string,
): Promise<VentasPorDia> {
  const { data } = await api.get('/reportes/ventas/por-dia', {
    params: {
      ...(sedeId ? { sedeId } : {}),
      fechaDesde,
      fechaHasta,
    },
  });
  return data;
}

async function getProductosMasVendidosSemana(
  sedeId: string | undefined,
  fechaInicio: string,
  fechaFin: string,
): Promise<ProductosMasVendidos> {
  const { data } = await api.get('/reportes/ventas/productos-mas-vendidos', {
    params: {
      ...(sedeId ? { sedeId } : {}),
      fechaDesde: fechaInicio,
      fechaHasta: fechaFin,
      top: 5,
    },
  });
  return data;
}
async function getStockBajo(sedeId: string | undefined): Promise<InventarioAlertas> {
  const { data } = await api.get('/reportes/inventario/alertas', {
    params: {
      ...(sedeId ? { sedeId } : {}),
    },
  });
  return data;
}
async function getVentasDiaRaw(sedeId: string | undefined, fecha: string) {
  const { data } = await api.get('/ventas', { params: { ...(sedeId ? { sedeId } : {}), fecha } });
  return data as Array<{ clienteId?: string | null }>;
}

function KpiCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col justify-between border shadow-sm transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none"
      style={{
        borderTop: `4px solid ${dashboardTheme.accent}`,
        backgroundColor: dashboardTheme.cardBg,
        borderColor: dashboardTheme.border,
      }}
    >
      <span
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: dashboardTheme.textMuted }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black" style={{ color: dashboardTheme.textStrong }}>
          {value}
        </span>
        {sub && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={
              alert
                ? { backgroundColor: dashboardTheme.dangerBg, color: dashboardTheme.dangerText }
                : { color: dashboardTheme.accent }
            }
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div
      className="animate-pulse rounded-xl h-24 w-full motion-reduce:animate-none"
      style={{ backgroundColor: dashboardTheme.borderSoft }}
    />
  );
}

export default function DashboardPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return toISODate(d);
  }, [today]);

  const sedesQuery = useQuery({
    queryKey: ['dashboard', 'sedes'],
    queryFn: getSedes,
    enabled: usuario?.rol === Rol.ADMIN,
    refetchInterval: 60000,
  });

  const sedesDisponibles = useMemo(() => {
    if (!usuario) return [] as Array<{ id: string; nombre: string }>;
    if (usuario.rol === Rol.ADMIN)
      return (sedesQuery.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre }));
    return usuario.sedeId ? [{ id: usuario.sedeId, nombre: 'Mi sede' }] : [];
  }, [sedesQuery.data, usuario]);

  const [selectedSedeId, setSelectedSedeId] = useState<string>(
    usuario?.rol === Rol.ADMIN ? '' : (usuario?.sedeId ?? ''),
  );

  useEffect(() => {
    if (usuario?.rol !== Rol.ADMIN) {
      setSelectedSedeId(usuario?.sedeId ?? '');
    }
  }, [usuario?.rol, usuario?.sedeId]);

  const apiSedeId = isUuidV4(selectedSedeId) ? selectedSedeId : undefined;

  const resumenHoy = useQuery({
    queryKey: ['dashboard', 'resumen-hoy', apiSedeId ?? 'all', todayISO],
    queryFn: () => getResumenVentasDia(apiSedeId, todayISO),
    refetchInterval: 60000,
  });

  const ventas7Dias = useQuery({
    queryKey: ['dashboard', 'ventas-7-dias', apiSedeId ?? 'all'],
    refetchInterval: 60000,
    queryFn: async () => {
      const data = await getVentasPorDia(apiSedeId, weekStart, todayISO);
      return data.serie.map((item) => ({
        fecha: item.fecha,
        label: formatChartDate(item.fecha),
        total: item.montoTotal,
      }));
    },
  });

  const topProductos = useQuery({
    queryKey: ['dashboard', 'top-productos', apiSedeId ?? 'all', weekStart],
    queryFn: () => getProductosMasVendidosSemana(apiSedeId, weekStart, todayISO),
    refetchInterval: 60000,
  });

  const stockBajo = useQuery({
    queryKey: ['dashboard', 'stock-bajo', apiSedeId ?? 'all'],
    queryFn: () => getStockBajo(apiSedeId),
    refetchInterval: 60000,
  });

  const clientesHoy = useQuery({
    queryKey: ['dashboard', 'clientes-hoy', apiSedeId ?? 'all'],
    queryFn: () => getVentasDiaRaw(apiSedeId, todayISO),
    refetchInterval: 60000,
  });

  const clientesUnicos = useMemo(
    () => new Set((clientesHoy.data ?? []).map((v) => v.clienteId).filter(Boolean)).size,
    [clientesHoy.data],
  );

  const pieData = useMemo(
    () =>
      (resumenHoy.data?.porMetodoPago ?? []).map((item) => ({
        name: item.metodoPago,
        value: item.montoTotal,
      })),
    [resumenHoy.data],
  );

  const isLoading = resumenHoy.isLoading || stockBajo.isLoading;
  const hasAnyError =
    resumenHoy.isError ||
    ventas7Dias.isError ||
    topProductos.isError ||
    stockBajo.isError ||
    clientesHoy.isError;

  const retryAll = async () => {
    await Promise.all([
      resumenHoy.refetch(),
      ventas7Dias.refetch(),
      topProductos.refetch(),
      stockBajo.refetch(),
      clientesHoy.refetch(),
    ]);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {hasAnyError && (
          <div
            role="alert"
            className="rounded-xl border px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: '#fff4f3',
              borderColor: dashboardTheme.dangerBg,
              color: dashboardTheme.dangerText,
            }}
          >
            <p className="text-sm font-semibold">
              No pudimos cargar por completo la información del dashboard.
            </p>
            <button
              onClick={retryAll}
              className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: dashboardTheme.dangerText,
                color: '#fff',
                borderColor: dashboardTheme.dangerText,
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: dashboardTheme.textStrong }}
            >
              Panel General
            </h1>
            <p className="font-medium text-sm" style={{ color: dashboardTheme.textSoft }}>
              Bienvenido al panel de Integral Cosméticos.
            </p>
          </div>
          {usuario?.rol === Rol.ADMIN && sedesDisponibles.length > 0 && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="sede-select"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: dashboardTheme.textMuted }}
              >
                Sede activa
              </label>
              <select
                id="sede-select"
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold border outline-none focus-visible:ring-2"
                style={{
                  borderColor: dashboardTheme.border,
                  color: dashboardTheme.textStrong,
                  backgroundColor: '#fff',
                }}
              >
                <option value="">Todas las sedes</option>
                {sedesDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} />
              ))}
            </>
          ) : (
            <>
              <KpiCard
                label="Ventas Hoy"
                value={copFormatter.format(resumenHoy.data?.montoTotal ?? 0)}
                sub="hoy"
              />
              <KpiCard
                label="Transacciones"
                value={String(resumenHoy.data?.totalVentas ?? 0)}
                sub={`Ticket prom: ${copFormatter.format(resumenHoy.data?.ticketPromedio ?? 0)}`}
              />
              <KpiCard
                label="Productos bajo mínimo"
                value={String(stockBajo.data?.alertas.length ?? 0)}
                sub={(stockBajo.data?.alertas.length ?? 0) > 0 ? 'REVISAR' : undefined}
                alert={(stockBajo.data?.alertas.length ?? 0) > 0}
              />
              <KpiCard
                label="Clientes atendidos"
                value={String(clientesUnicos)}
                sub="con identificación"
              />
            </>
          )}
        </div>

        {/* Line Chart */}
        <div
          className="rounded-xl shadow-sm border p-6 md:p-8"
          style={{ backgroundColor: dashboardTheme.cardBg, borderColor: dashboardTheme.border }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold" style={{ color: dashboardTheme.textStrong }}>
              Ventas últimos 7 días
            </h3>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: dashboardTheme.accent }}
              />
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: dashboardTheme.textMuted }}
              >
                Ingresos (COP)
              </span>
            </div>
          </div>
          {ventas7Dias.isLoading ? (
            <div
              className="h-64 animate-pulse rounded-xl motion-reduce:animate-none"
              style={{ backgroundColor: dashboardTheme.borderSoft }}
            />
          ) : ventas7Dias.data && ventas7Dias.data.length > 0 ? (
            <div className="h-64" aria-label="Gráfica de ventas de los últimos 7 días">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventas7Dias.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dashboardTheme.borderSoft} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: dashboardTheme.textMuted, fontWeight: 700, fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                    tick={{ fill: dashboardTheme.textMuted, fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => copFormatter.format(Number(v))} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={dashboardTheme.accent}
                    strokeWidth={3}
                    dot={{ fill: dashboardTheme.accent, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="h-64 rounded-xl border grid place-items-center"
              style={{ borderColor: dashboardTheme.borderSoft }}
            >
              <p className="text-sm font-semibold" style={{ color: dashboardTheme.textSoft }}>
                Aún no hay ventas registradas esta semana.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos mas vendidos */}
          <div
            className="rounded-xl shadow-sm border p-6 md:p-8"
            style={{ backgroundColor: dashboardTheme.cardBg, borderColor: dashboardTheme.border }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: dashboardTheme.textStrong }}>
              5 productos mas vendidos
            </h3>
            {topProductos.isLoading ? (
              <div
                className="h-56 animate-pulse rounded-xl motion-reduce:animate-none"
                style={{ backgroundColor: dashboardTheme.borderSoft }}
              />
            ) : topProductos.data && topProductos.data.porCantidad.length > 0 ? (
              <div className="space-y-5">
                {topProductos.data.porCantidad.slice(0, 5).map((p, i) => {
                  const max = topProductos.data?.porCantidad[0]?.cantidadVendida ?? 1;
                  const pct = Math.round((p.cantidadVendida / max) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div
                        className="flex justify-between text-xs font-bold uppercase"
                        style={{ color: dashboardTheme.textMuted }}
                      >
                        <span>{p.nombre}</span>
                        <span>{p.cantidadVendida} uds</span>
                      </div>
                      <div
                        className="w-full rounded-full h-3"
                        style={{ backgroundColor: dashboardTheme.borderSoft }}
                      >
                        <div
                          className="h-3 rounded-full transition-all motion-reduce:transition-none"
                          style={{ width: `${pct}%`, backgroundColor: dashboardTheme.accentSoft }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="h-56 rounded-xl border grid place-items-center"
                style={{ borderColor: dashboardTheme.borderSoft }}
              >
                <p className="text-sm font-semibold" style={{ color: dashboardTheme.textSoft }}>
                  No hay productos vendidos en el rango seleccionado.
                </p>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div
            className="rounded-xl shadow-sm border p-6 md:p-8 flex flex-col"
            style={{ backgroundColor: dashboardTheme.cardBg, borderColor: dashboardTheme.border }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: dashboardTheme.textStrong }}>
              Ventas por método de pago
            </h3>
            {resumenHoy.isLoading ? (
              <div
                className="h-56 animate-pulse rounded-xl motion-reduce:animate-none"
                style={{ backgroundColor: dashboardTheme.borderSoft }}
              />
            ) : pieData.length > 0 ? (
              <div className="h-56" aria-label="Distribución de ventas por método de pago">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={pieColors[entry.name] ?? '#dac0c5'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => copFormatter.format(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="h-56 rounded-xl border grid place-items-center"
                style={{ borderColor: dashboardTheme.borderSoft }}
              >
                <p className="text-sm font-semibold" style={{ color: dashboardTheme.textSoft }}>
                  No hay métodos de pago para mostrar hoy.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de stock bajo */}
        <div
          className="rounded-xl shadow-sm overflow-hidden border"
          style={{ backgroundColor: dashboardTheme.cardBg, borderColor: dashboardTheme.border }}
        >
          <div
            className="px-6 md:px-8 py-5 border-b flex justify-between items-center"
            style={{ borderColor: dashboardTheme.borderSoft }}
          >
            <h3 className="text-xl font-bold" style={{ color: dashboardTheme.textStrong }}>
              Productos bajo stock mínimo
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ backgroundColor: dashboardTheme.bgSoft }}>
                <tr>
                  {['Producto', 'Variante', 'Stock actual', 'Minimo', 'Estado'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-6 md:px-8 py-4 text-xs font-bold uppercase tracking-widest"
                      style={{ color: dashboardTheme.textMuted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ color: dashboardTheme.textStrong }}>
                {(stockBajo.data?.alertas ?? []).map((item, i) => (
                  <tr
                    key={i}
                    className="border-t transition-colors hover:bg-[#fcf8fa]"
                    style={{ borderColor: dashboardTheme.borderSoft }}
                  >
                    <td className="px-6 md:px-8 py-5 font-semibold">{item.producto}</td>
                    <td className="px-6 md:px-8 py-5" style={{ color: dashboardTheme.textSoft }}>
                      {item.variante}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center font-black tabular-nums">
                      {item.stockActual}
                    </td>
                    <td
                      className="px-6 md:px-8 py-5 text-center tabular-nums"
                      style={{ color: dashboardTheme.textMuted }}
                    >
                      {item.stockMinimo}
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black uppercase"
                        style={
                          item.stockActual === 0
                            ? {
                                backgroundColor: dashboardTheme.dangerBg,
                                color: dashboardTheme.dangerText,
                              }
                            : {
                                backgroundColor: dashboardTheme.warningBg,
                                color: dashboardTheme.warningText,
                              }
                        }
                      >
                        {item.stockActual === 0 ? 'Agotado' : 'Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(stockBajo.data?.alertas ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-8 text-center" style={{ color: '#877176' }}>
                      Todo el inventario esta en niveles optimos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
