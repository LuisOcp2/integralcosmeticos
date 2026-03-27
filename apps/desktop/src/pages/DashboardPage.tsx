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
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import AppLayout from './components/AppLayout';

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const [y, m, d] = isoDate.split('-').map(Number);
  return days[new Date(y, m - 1, d).getDay()];
};

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}
async function getResumenVentasDia(sedeId: string, fecha: string): Promise<IResumenVentasDia> {
  const { data } = await api.get('/reportes/ventas-dia', { params: { sedeId, fecha } });
  return data;
}
async function getProductosMasVendidosSemana(sedeId: string, fechaInicio: string, fechaFin: string): Promise<IProductoMasVendido[]> {
  const { data } = await api.get('/reportes/productos-mas-vendidos', { params: { sedeId, fechaInicio, fechaFin, limit: 5 } });
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

function KpiCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-6 flex flex-col justify-between transition-transform hover:-translate-y-1"
      style={{ borderTop: '4px solid #A43E63' }}
    >
      <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#735946' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black" style={{ color: '#2E1B0C' }}>{value}</span>
        {sub && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={alert ? { backgroundColor: '#ffdad6', color: '#93000a' } : { color: '#A43E63' }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="animate-pulse rounded-xl h-24 w-full" style={{ backgroundColor: '#f1edef' }} />;
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
    if (usuario.rol === Rol.ADMIN) return (sedesQuery.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre }));
    return usuario.sedeId ? [{ id: usuario.sedeId, nombre: 'Mi sede' }] : [];
  }, [sedesQuery.data, usuario]);

  const [selectedSedeId, setSelectedSedeId] = useState<string>(usuario?.sedeId ?? '');
  const effectiveSedeId = selectedSedeId || sedesDisponibles[0]?.id || '';

  const resumenHoy = useQuery({
    queryKey: ['dashboard', 'resumen-hoy', effectiveSedeId, todayISO],
    queryFn: () => getResumenVentasDia(effectiveSedeId, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const ventas7Dias = useQuery({
    queryKey: ['dashboard', 'ventas-7-dias', effectiveSedeId],
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
    queryFn: async () => {
      const dates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return toISODate(d);
      });
      return Promise.all(
        dates.map(async (fecha) => ({
          fecha,
          label: formatChartDate(fecha),
          total: (await getResumenVentasDia(effectiveSedeId, fecha)).totalVentas,
        }))
      );
    },
  });

  const topProductos = useQuery({
    queryKey: ['dashboard', 'top-productos', effectiveSedeId, weekStart],
    queryFn: () => getProductosMasVendidosSemana(effectiveSedeId, weekStart, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const stockBajo = useQuery({
    queryKey: ['dashboard', 'stock-bajo', effectiveSedeId],
    queryFn: () => getStockBajo(effectiveSedeId),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const clientesHoy = useQuery({
    queryKey: ['dashboard', 'clientes-hoy', effectiveSedeId],
    queryFn: () => getVentasDiaRaw(effectiveSedeId, todayISO),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const clientesUnicos = useMemo(() =>
    new Set((clientesHoy.data ?? []).map((v) => v.clienteId).filter(Boolean)).size,
    [clientesHoy.data]
  );

  const pieData = useMemo(() =>
    (resumenHoy.data?.desglosePorMetodoPago ?? []).map((item) => ({
      name: item.metodoPago,
      value: item.total,
    })),
    [resumenHoy.data]
  );

  const isLoading = resumenHoy.isLoading || stockBajo.isLoading;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#2E1B0C' }}>Dashboard General</h1>
            <p className="font-medium text-sm" style={{ color: '#785d4a' }}>Bienvenido al panel de Integral Cosméticos.</p>
          </div>
          {usuario?.rol === Rol.ADMIN && sedesDisponibles.length > 0 && (
            <select
              value={effectiveSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold border outline-none"
              style={{ borderColor: '#dac0c5', color: '#2E1B0C', backgroundColor: '#fff' }}
            >
              {sedesDisponibles.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>{[...Array(4)].map((_, i) => <Skeleton key={i} />)}</>
          ) : (
            <>
              <KpiCard
                label="Ventas Hoy"
                value={copFormatter.format(resumenHoy.data?.totalVentas ?? 0)}
                sub="hoy"
              />
              <KpiCard
                label="Transacciones"
                value={String(resumenHoy.data?.cantidadTransacciones ?? 0)}
                sub={`Ticket prom: ${copFormatter.format(
                  (resumenHoy.data?.totalVentas ?? 0) / Math.max(resumenHoy.data?.cantidadTransacciones ?? 1, 1)
                )}`}
              />
              <KpiCard
                label="Productos bajo mínimo"
                value={String(stockBajo.data?.length ?? 0)}
                sub={(stockBajo.data?.length ?? 0) > 0 ? 'REVISAR' : undefined}
                alert={(stockBajo.data?.length ?? 0) > 0}
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
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold" style={{ color: '#2E1B0C' }}>Ventas últimos 7 días</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#A43E63' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#735946' }}>Ingresos (COP)</span>
            </div>
          </div>
          {ventas7Dias.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl" style={{ backgroundColor: '#f1edef' }} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventas7Dias.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1edef" />
                  <XAxis dataKey="label" tick={{ fill: '#735946', fontWeight: 700, fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fill: '#735946', fontSize: 11 }} />
                  <Tooltip formatter={(v) => copFormatter.format(Number(v))} />
                  <Line type="monotone" dataKey="total" stroke="#A43E63" strokeWidth={3} dot={{ fill: '#A43E63', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Productos */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="text-xl font-bold mb-6" style={{ color: '#2E1B0C' }}>Top 5 Productos</h3>
            {topProductos.isLoading ? (
              <div className="h-56 animate-pulse rounded-xl" style={{ backgroundColor: '#f1edef' }} />
            ) : (
              <div className="space-y-5">
                {(topProductos.data ?? []).slice(0, 5).map((p, i) => {
                  const max = topProductos.data?.[0]?.totalUnidades ?? 1;
                  const pct = Math.round((p.totalUnidades / max) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase" style={{ color: '#735946' }}>
                        <span>{p.nombre}</span>
                        <span>{p.totalUnidades} uds</span>
                      </div>
                      <div className="w-full rounded-full h-3" style={{ backgroundColor: '#f1edef' }}>
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: '#FBA9E5' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col">
            <h3 className="text-xl font-bold mb-6" style={{ color: '#2E1B0C' }}>Ventas por Método de Pago</h3>
            {resumenHoy.isLoading ? (
              <div className="h-56 animate-pulse rounded-xl" style={{ backgroundColor: '#f1edef' }} />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={pieColors[entry.name] ?? '#dac0c5'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => copFormatter.format(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Stock Bajo Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b flex justify-between items-center" style={{ borderColor: '#f1edef' }}>
            <h3 className="text-xl font-bold" style={{ color: '#2E1B0C' }}>Productos bajo stock mínimo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ backgroundColor: '#f6f2f4' }}>
                <tr>
                  {['Producto', 'Variante', 'Stock Actual', 'Mínimo', 'Estado'].map((h) => (
                    <th key={h} className="px-8 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#735946' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ color: '#2E1B0C' }}>
                {(stockBajo.data ?? []).map((item, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-[#fcf8fa]" style={{ borderColor: '#f1edef' }}>
                    <td className="px-8 py-5 font-semibold">{item.nombreProducto}</td>
                    <td className="px-8 py-5" style={{ color: '#785d4a' }}>{item.nombreVariante}</td>
                    <td className="px-8 py-5 text-center font-black">{item.cantidad}</td>
                    <td className="px-8 py-5 text-center" style={{ color: '#735946' }}>{item.stockMinimo}</td>
                    <td className="px-8 py-5">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black uppercase"
                        style={
                          item.cantidad === 0
                            ? { backgroundColor: '#ffdad6', color: '#93000a' }
                            : { backgroundColor: '#ffdcc4', color: '#5a4230' }
                        }
                      >
                        {item.cantidad === 0 ? 'Agotado' : 'Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(stockBajo.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-8 text-center" style={{ color: '#877176' }}>
                      ✅ Todo el inventario está en niveles óptimos
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
