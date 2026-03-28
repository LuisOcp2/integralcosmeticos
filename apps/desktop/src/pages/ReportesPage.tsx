import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IClienteFrecuente,
  IMargenProducto,
  IProductoMasVendido,
  IResumenCierreCaja,
  IStockReporte,
  ISede,
  IVentasPorSede,
  Rol,
} from '@cosmeticos/shared-types';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import AppLayout from './components/AppLayout';

type ReportTab =
  | 'ventas-periodo'
  | 'productos-vendidos'
  | 'inventario-stock'
  | 'clientes-frecuentes'
  | 'cierre-caja';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: toISODate(start), end: toISODate(end) };
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  accent: string;
}) {
  return (
    <div
      className="bg-surface-container-low p-6 rounded-2xl border-l-4"
      style={{ borderColor: accent }}
    >
      <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-on-secondary-fixed">{value}</p>
      {delta && (
        <p className="text-xs font-bold mt-2 flex items-center gap-1" style={{ color: accent }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {delta.startsWith('+')
              ? 'trending_up'
              : delta === '0'
                ? 'horizontal_rule'
                : 'trending_down'}
          </span>
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}
async function getVentasPorSede(fechaInicio: string, fechaFin: string): Promise<IVentasPorSede[]> {
  const { data } = await api.get('/reportes/ventas-sede', { params: { fechaInicio, fechaFin } });
  return data;
}
async function getProductosMasVendidos(
  sedeId: string,
  fechaInicio: string,
  fechaFin: string,
  limit: number,
): Promise<IProductoMasVendido[]> {
  const { data } = await api.get('/reportes/productos-mas-vendidos', {
    params: { sedeId, fechaInicio, fechaFin, limit },
  });
  return data;
}
async function getMargenPorProducto(
  sedeId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<IMargenProducto[]> {
  const { data } = await api.get('/reportes/margen', { params: { sedeId, fechaInicio, fechaFin } });
  return data;
}
async function getStockPorSede(sedeId: string): Promise<IStockReporte[]> {
  const { data } = await api.get('/reportes/stock', { params: { sedeId } });
  return data;
}
async function getClientesFrecuentes(
  sedeId: string,
  fechaInicio: string,
  fechaFin: string,
  limit: number,
): Promise<IClienteFrecuente[]> {
  const { data } = await api.get('/reportes/clientes-frecuentes', {
    params: { sedeId, fechaInicio, fechaFin, limit },
  });
  return data;
}
async function getCierreCaja(sedeId: string, fecha: string): Promise<IResumenCierreCaja | null> {
  const { data } = await api.get('/reportes/cierre-caja', { params: { sedeId, fecha } });
  return data;
}

export default function ReportesPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const range = useMemo(() => defaultRange(), []);

  const [activeTab, setActiveTab] = useState<ReportTab>('ventas-periodo');
  const [fechaInicio, setFechaInicio] = useState(range.start);
  const [fechaFin, setFechaFin] = useState(range.end);
  const [fechaCaja, setFechaCaja] = useState(range.end);
  const [limit, setLimit] = useState(10);
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [selectedSedeId, setSelectedSedeId] = useState(usuario?.sedeId ?? '');

  const sedesQuery = useQuery({
    queryKey: ['reportes', 'sedes', usuario?.rol],
    queryFn: getSedes,
    enabled: usuario?.rol === Rol.ADMIN,
    refetchInterval: 60000,
  });

  const sedesDisponibles = useMemo(() => {
    if (!usuario) return [] as { id: string; nombre: string }[];
    if (usuario.rol === Rol.ADMIN)
      return (sedesQuery.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre }));
    return usuario.sedeId ? [{ id: usuario.sedeId, nombre: 'Mi sede' }] : [];
  }, [sedesQuery.data, usuario]);

  const effectiveSedeId = selectedSedeId || usuario?.sedeId || sedesDisponibles[0]?.id || '';

  const ventasSedeQuery = useQuery({
    queryKey: ['reportes', 'ventas-sede', fechaInicio, fechaFin],
    queryFn: () => getVentasPorSede(fechaInicio, fechaFin),
    refetchInterval: 60000,
  });
  const productosMasVendidosQuery = useQuery({
    queryKey: ['reportes', 'productos-mas-vendidos', effectiveSedeId, fechaInicio, fechaFin, limit],
    queryFn: () => getProductosMasVendidos(effectiveSedeId, fechaInicio, fechaFin, limit),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });
  const margenesQuery = useQuery({
    queryKey: ['reportes', 'margen', effectiveSedeId, fechaInicio, fechaFin],
    queryFn: () => getMargenPorProducto(effectiveSedeId, fechaInicio, fechaFin),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });
  const stockQuery = useQuery({
    queryKey: ['reportes', 'stock', effectiveSedeId],
    queryFn: () => getStockPorSede(effectiveSedeId),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });
  const clientesQuery = useQuery({
    queryKey: ['reportes', 'clientes-frecuentes', effectiveSedeId, fechaInicio, fechaFin],
    queryFn: () => getClientesFrecuentes(effectiveSedeId, fechaInicio, fechaFin, 10),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });
  const cierreCajaQuery = useQuery({
    queryKey: ['reportes', 'cierre-caja', effectiveSedeId, fechaCaja],
    queryFn: () => getCierreCaja(effectiveSedeId, fechaCaja),
    enabled: Boolean(effectiveSedeId),
    refetchInterval: 60000,
  });

  const ventasSedeFiltradas = useMemo(() => {
    if (usuario?.rol === Rol.ADMIN)
      return (ventasSedeQuery.data ?? []).filter(
        (i) => !selectedSedeId || i.sedeId === selectedSedeId,
      );
    return (ventasSedeQuery.data ?? []).filter((i) => i.sedeId === effectiveSedeId);
  }, [effectiveSedeId, selectedSedeId, usuario?.rol, ventasSedeQuery.data]);

  const productosConMargen = useMemo(() => {
    const margenMap = new Map(
      (margenesQuery.data ?? []).map((i) => [i.productoId, i.margenPorcentaje]),
    );
    return (productosMasVendidosQuery.data ?? []).map((i) => ({
      ...i,
      margenPorcentaje: margenMap.get(i.productoId) ?? 0,
    }));
  }, [productosMasVendidosQuery.data, margenesQuery.data]);

  const stockFiltrado = useMemo(() => {
    const base = stockQuery.data ?? [];
    return soloBajoMinimo ? base.filter((i) => i.cantidad <= i.stockMinimo) : base;
  }, [soloBajoMinimo, stockQuery.data]);

  // Summary KPIs from ventas
  const kpis = useMemo(() => {
    const all = ventasSedeQuery.data ?? [];
    const totalVentas = all.reduce((a, i) => a + Number(i.totalVentas), 0);
    const totalTx = all.reduce((a, i) => a + Number(i.cantidadTransacciones), 0);
    const ticketProm = totalTx > 0 ? totalVentas / totalTx : 0;
    const margenProm = margenesQuery.data?.length
      ? margenesQuery.data.reduce((a, i) => a + i.margenPorcentaje, 0) / margenesQuery.data.length
      : 0;
    return { totalVentas, totalTx, ticketProm, margenProm };
  }, [ventasSedeQuery.data, margenesQuery.data]);

  const maxVenta = Math.max(...ventasSedeFiltradas.map((s) => Number(s.totalVentas)), 1);

  const exportarStockCSV = () => {
    const headers = ['Producto', 'Variante', 'SedeId', 'StockActual', 'StockMinimo', 'Alerta'];
    const rows = stockFiltrado.map((i) => [
      i.nombreProducto,
      i.nombreVariante,
      i.sedeId,
      String(i.cantidad),
      String(i.stockMinimo),
      i.alerta ? 'SI' : 'NO',
    ]);
    const content = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-reporte-${effectiveSedeId || 'general'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const nivelCliente = (compras: number) => {
    if (compras < 5) return { label: 'BRONCE', bg: '#fff8e1', color: '#e65100' };
    if (compras <= 15) return { label: 'PLATA', bg: '#f5f5f5', color: '#546e7a' };
    return { label: 'ORO', bg: '#fffde7', color: '#f9a825' };
  };

  const tabs: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'ventas-periodo', label: 'Ventas por período', icon: 'bar_chart' },
    { id: 'productos-vendidos', label: 'Productos más vendidos', icon: 'workspace_premium' },
    { id: 'inventario-stock', label: 'Inventario', icon: 'inventory_2' },
    { id: 'clientes-frecuentes', label: 'Clientes frecuentes', icon: 'group' },
    { id: 'cierre-caja', label: 'Cierre de caja', icon: 'payments' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">
              Reportes
            </h1>
            <p className="text-secondary font-medium mt-1">
              Análisis detallado de rendimiento y gestión
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Rango de fechas */}
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl shadow-sm gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>
                calendar_today
              </span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-on-surface p-0 w-32"
              />
              <span className="text-secondary text-sm">—</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-on-surface p-0 w-32"
              />
            </div>
            {/* Sedes */}
            <select
              value={effectiveSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              disabled={usuario?.rol !== Rol.ADMIN}
              className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl shadow-sm text-sm font-semibold text-on-surface focus:border-primary focus:ring-0 min-w-[160px]"
            >
              <option value="">Todas las sedes</option>
              {sedesDisponibles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {/* Export */}
            <button
              onClick={exportarStockCSV}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-on-secondary-fixed text-on-secondary-fixed font-bold rounded-xl hover:bg-on-secondary-fixed hover:text-white transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                download
              </span>
              Exportar CSV
            </button>
          </div>
        </header>

        {/* ── Tabs ── */}
        <nav className="flex border-b border-outline-variant/20 overflow-x-auto whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-4 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-secondary border-transparent hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── KPI summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Ventas Totales"
            value={cop.format(kpis.totalVentas)}
            delta="+"
            deltaLabel="Período seleccionado"
            accent="#85264b"
          />
          <StatCard
            label="Tickets Generados"
            value={kpis.totalTx.toLocaleString('es-CO')}
            delta="+"
            deltaLabel="Período seleccionado"
            accent="#733266"
          />
          <StatCard
            label="Ticket Promedio"
            value={cop.format(kpis.ticketProm)}
            delta="0"
            deltaLabel="Estable"
            accent="#735946"
          />
          <StatCard
            label="Margen Neto Prom."
            value={`${kpis.margenProm.toFixed(1)}%`}
            delta="+"
            deltaLabel="Eficiencia"
            accent="#85264b"
          />
        </div>

        {/* ══ TAB: Ventas por período ══ */}
        {activeTab === 'ventas-periodo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 space-y-8">
              {/* Bar visual */}
              <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-on-secondary-fixed">Ventas por Sede</h3>
                  <span className="flex items-center gap-1 text-xs font-bold text-secondary">
                    <span className="w-3 h-3 bg-primary rounded-full inline-block" /> Ventas Totales
                  </span>
                </div>
                {ventasSedeQuery.isLoading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Recharts */}
                    <div className="h-60 w-full mb-8">
                      <ResponsiveContainer>
                        <BarChart
                          data={ventasSedeFiltradas}
                          margin={{ top: 4, right: 8, left: 16, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#dac0c5" />
                          <XAxis dataKey="nombreSede" tick={{ fontSize: 12, fill: '#735946' }} />
                          <YAxis
                            tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)}M`}
                            tick={{ fontSize: 11, fill: '#877176' }}
                          />
                          <Tooltip
                            formatter={(v) => cop.format(Number(v))}
                            cursor={{ fill: '#ffd9e1' }}
                          />
                          <Bar dataKey="totalVentas" fill="#85264b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Barras horizontales visuales */}
                    <div className="space-y-6">
                      {ventasSedeFiltradas.map((sede) => (
                        <div key={sede.sedeId} className="space-y-2">
                          <div className="flex justify-between text-sm font-bold text-on-surface">
                            <span>{sede.nombreSede}</span>
                            <span>{cop.format(Number(sede.totalVentas))}</span>
                          </div>
                          <div className="h-5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${(Number(sede.totalVentas) / maxVenta) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Tabla */}
              <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                      <th className="px-6 py-4">Sede</th>
                      <th className="px-6 py-4 text-right">Total Ventas</th>
                      <th className="px-6 py-4 text-right">Transacciones</th>
                      <th className="px-6 py-4 text-right">Ticket Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {ventasSedeFiltradas.map((item, i) => {
                      const ticketProm =
                        item.cantidadTransacciones > 0
                          ? Number(item.totalVentas) / Number(item.cantidadTransacciones)
                          : 0;
                      return (
                        <tr
                          key={item.sedeId}
                          className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                        >
                          <td className="px-6 py-5 font-bold text-on-surface">{item.nombreSede}</td>
                          <td className="px-6 py-5 text-right font-medium">
                            {cop.format(Number(item.totalVentas))}
                          </td>
                          <td className="px-6 py-5 text-right">
                            {item.cantidadTransacciones.toLocaleString('es-CO')}
                          </td>
                          <td className="px-6 py-5 text-right">{cop.format(ticketProm)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Ranking lateral */}
            <section>
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm">
                <h3 className="text-xl font-bold text-on-secondary-fixed mb-6 flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}
                  >
                    workspace_premium
                  </span>
                  Productos más vendidos
                </h3>
                {productosMasVendidosQuery.isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productosConMargen.slice(0, 5).map((item, index) => (
                      <div
                        key={item.productoId}
                        className={`p-4 rounded-xl border flex items-center gap-4 ${index < 3 ? 'bg-tertiary-fixed/30 border-outline-variant/30' : 'bg-surface-container'}`}
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg text-sm ${index < 3 ? 'bg-tertiary text-white' : 'bg-outline-variant text-on-surface-variant'}`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">
                            {item.nombre}
                          </p>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-secondary font-medium">
                              {item.totalUnidades} uds
                            </span>
                            <span
                              className={`text-xs font-bold ${index < 3 ? 'text-tertiary' : 'text-on-surface-variant'}`}
                            >
                              {item.margenPorcentaje.toFixed(0)}% Mar.
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ══ TAB: Productos más vendidos ══ */}
        {activeTab === 'productos-vendidos' && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-on-secondary-fixed">Productos más vendidos</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-secondary">Mostrar</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 10))}
                  className="w-20 rounded-xl border border-outline-variant/30 px-3 py-2 text-sm text-center font-bold bg-surface-container-lowest"
                />
              </div>
            </div>
            {productosMasVendidosQuery.isLoading || margenesQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <>
                <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
                  <div className="h-72">
                    <ResponsiveContainer>
                      <BarChart
                        layout="vertical"
                        data={productosConMargen.slice(0, 10)}
                        margin={{ left: 24, right: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dac0c5" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#877176' }} />
                        <YAxis
                          type="category"
                          dataKey="nombre"
                          width={180}
                          tick={{ fontSize: 11, fill: '#2a1709' }}
                        />
                        <Tooltip />
                        <Bar dataKey="totalUnidades" fill="#a43e63" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Producto</th>
                        <th className="px-6 py-4 text-right">Unidades</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                        <th className="px-6 py-4 text-right">Margen %</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {productosConMargen.map((item, index) => (
                        <tr
                          key={item.productoId}
                          className={`border-b border-outline-variant/5 ${index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                        >
                          <td className="px-6 py-4 font-black text-secondary">{index + 1}</td>
                          <td className="px-6 py-4 font-bold text-on-surface">{item.nombre}</td>
                          <td className="px-6 py-4 text-right">{item.totalUnidades}</td>
                          <td className="px-6 py-4 text-right font-medium">
                            {cop.format(item.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className="font-bold"
                              style={{
                                color:
                                  item.margenPorcentaje >= 20
                                    ? '#2e7d32'
                                    : item.margenPorcentaje >= 10
                                      ? '#e65100'
                                      : '#ba1a1a',
                              }}
                            >
                              {item.margenPorcentaje.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ══ TAB: Inventario ══ */}
        {activeTab === 'inventario-stock' && (
          <section className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="text-xl font-bold text-on-secondary-fixed">
                Inventario y existencias
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setSoloBajoMinimo((p) => !p)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${soloBajoMinimo ? 'bg-error/10 border-error text-error' : 'border-outline-variant/30 text-secondary'}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    warning
                  </span>
                  {soloBajoMinimo ? 'Mostrando alertas' : 'Ver solo bajo mínimo'}
                </button>
                <button
                  onClick={exportarStockCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ backgroundColor: '#85264b' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    download
                  </span>
                  Exportar CSV
                </button>
              </div>
            </div>
            {/* Resumen alertas */}
            {!stockQuery.isLoading && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-container-low p-4 rounded-2xl border-l-4 border-primary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Total productos
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {stockQuery.data?.length ?? 0}
                  </p>
                </div>
                <div className="bg-error-container/40 p-4 rounded-2xl border-l-4 border-error">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Alertas de stock
                  </p>
                  <p className="text-2xl font-black text-error">
                    {stockQuery.data?.filter((i) => i.alerta).length ?? 0}
                  </p>
                </div>
                <div
                  className="bg-surface-container-low p-4 rounded-2xl border-l-4"
                  style={{ borderColor: '#2e7d32' }}
                >
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Sin alerta
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {stockQuery.data?.filter((i) => !i.alerta).length ?? 0}
                  </p>
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
              {stockQuery.isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">Variante</th>
                      <th className="px-6 py-4 text-right">Existencias</th>
                      <th className="px-6 py-4 text-right">Mínimo</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {stockFiltrado.map((item, i) => (
                      <tr
                        key={`${item.sedeId}-${item.varianteId}`}
                        className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                      >
                        <td className="px-6 py-4 font-bold text-on-surface">
                          {item.nombreProducto}
                        </td>
                        <td className="px-6 py-4 text-secondary">{item.nombreVariante}</td>
                        <td
                          className={`px-6 py-4 text-right font-black ${item.alerta ? 'text-error' : 'text-on-surface'}`}
                        >
                          {item.cantidad}
                        </td>
                        <td className="px-6 py-4 text-right text-secondary">{item.stockMinimo}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={
                              item.alerta
                                ? { backgroundColor: '#ffdad6', color: '#ba1a1a' }
                                : { backgroundColor: '#e8f5e9', color: '#2e7d32' }
                            }
                          >
                            {item.alerta ? '⚠ Alerta' : '✓ OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* ══ TAB: Clientes frecuentes ══ */}
        {activeTab === 'clientes-frecuentes' && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-on-secondary-fixed">Clientes Frecuentes</h2>
            <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
              {clientesQuery.isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Documento</th>
                      <th className="px-6 py-4 text-right">Compras</th>
                      <th className="px-6 py-4 text-right">Total gastado</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                      <th className="px-6 py-4 text-center">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(clientesQuery.data ?? []).map((item, index) => {
                      const nivel = nivelCliente(item.totalCompras);
                      return (
                        <tr
                          key={item.clienteId}
                          className={`border-b border-outline-variant/5 ${index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                        >
                          <td className="px-6 py-4 font-black text-secondary">{index + 1}</td>
                          <td className="px-6 py-4 font-bold text-on-surface">{item.nombre}</td>
                          <td className="px-6 py-4 text-secondary">{item.documento}</td>
                          <td className="px-6 py-4 text-right">{item.totalCompras}</td>
                          <td className="px-6 py-4 text-right font-medium">
                            {cop.format(item.totalGastado)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-primary">
                            {item.puntosAcumulados}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-black"
                              style={{ backgroundColor: nivel.bg, color: nivel.color }}
                            >
                              {nivel.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* ══ TAB: Cierre de caja ══ */}
        {activeTab === 'cierre-caja' && (
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-on-secondary-fixed">Cierre de Caja</h2>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/30 px-4 py-2 rounded-xl gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>
                  event
                </span>
                <input
                  type="date"
                  value={fechaCaja}
                  onChange={(e) => setFechaCaja(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-on-surface p-0"
                />
              </div>
            </div>
            {cierreCajaQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : cierreCajaQuery.data ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-secondary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Monto Inicial
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {cop.format(Number(cierreCajaQuery.data.montoInicial))}
                  </p>
                </div>
                <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-primary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Total Ventas
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {cop.format(Number(cierreCajaQuery.data.totalVentas))}
                  </p>
                </div>
                <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-tertiary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Total Efectivo
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {cop.format(Number(cierreCajaQuery.data.totalEfectivo))}
                  </p>
                </div>
                <div
                  className="p-6 rounded-2xl border-l-4"
                  style={{
                    borderColor:
                      Number(cierreCajaQuery.data.diferencia) >= 0 ? '#2e7d32' : '#ba1a1a',
                    backgroundColor:
                      Number(cierreCajaQuery.data.diferencia) >= 0 ? '#e8f5e9' : '#ffdad6',
                  }}
                >
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Diferencia
                  </p>
                  <p
                    className="text-2xl font-black"
                    style={{
                      color: Number(cierreCajaQuery.data.diferencia) >= 0 ? '#2e7d32' : '#ba1a1a',
                    }}
                  >
                    {cop.format(Number(cierreCajaQuery.data.diferencia))}
                  </p>
                  <p
                    className="text-xs font-bold mt-2"
                    style={{
                      color: Number(cierreCajaQuery.data.diferencia) >= 0 ? '#2e7d32' : '#ba1a1a',
                    }}
                  >
                    {Number(cierreCajaQuery.data.diferencia) >= 0
                      ? '✓ Cuadre correcto'
                      : '⚠ Revisar diferencia'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
                <span className="material-symbols-outlined text-5xl text-outline">payments</span>
                <p className="text-sm font-bold text-secondary">
                  No hay cierre de caja para la fecha seleccionada
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
