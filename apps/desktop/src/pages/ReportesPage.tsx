import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Gauge,
  Package,
  Store,
  Users,
} from 'lucide-react';
import { Rol, type ISede } from '@cosmeticos/shared-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

type ReportTab = 'dashboard' | 'ventas' | 'inventario' | 'clientes';

type VentasResumen = {
  totalVentas: number;
  montoTotal: number;
  ticketPromedio: number;
  comparativaPeriodoAnteriorPct: number;
  porMetodoPago: Array<{ metodoPago: string; cantidad: number; montoTotal: number }>;
};

type VentasPorDia = {
  serie: Array<{ fecha: string; totalVentas: number; montoTotal: number }>;
};

type VentasPorCategoria = {
  categorias: Array<{
    categoriaId: string | null;
    categoria: string;
    cantidadVendida: number;
    montoTotal: number;
  }>;
};

type ProductosMasVendidos = {
  porCantidad: Array<{
    posicion: number;
    productoId: string;
    nombre: string;
    cantidadVendida: number;
    montoTotal: number;
  }>;
};

type InventarioValorizado = {
  items: Array<{
    sedeId: string;
    sede: string;
    categoriaId: string | null;
    categoria: string;
    productos: number;
    stockUnidades: number;
    valorInventario: number;
  }>;
};

type InventarioAlertas = {
  total: number;
  alertas: Array<{
    stockId: string;
    sedeId: string;
    sede: string;
    productoId: string;
    producto: string;
    varianteId: string;
    variante: string;
    stockActual: number;
    stockMinimo: number;
    deficit: number;
  }>;
};

type InventarioRotacion = {
  mayorRotacion: Array<{
    productoId: string;
    producto: string;
    cantidadVendida: number;
    stockPromedio: number;
    rotacion: number;
  }>;
};

type ClientesNuevos = {
  total: number;
  clientes: Array<{ clienteId: string; nombre: string; documento: string; fechaRegistro: string }>;
};

type ClientesFrecuentes = {
  top: Array<{
    posicion: number;
    clienteId: string;
    cliente: string;
    documento: string;
    compras: number;
    montoTotal: number;
    ultimaCompra: string;
  }>;
};

type ClientesRetencion = {
  retenidos: number;
  totalMesAnterior: number;
  totalMesActual: number;
  tasaRetencion: number;
};

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

const isUuidV4 = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-center">
      <p className="text-sm font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-xs text-secondary">{subtitle}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-5 border-l-4 border-primary">
      <p className="text-xs uppercase tracking-widest text-secondary font-bold">{label}</p>
      <p className="mt-1 text-2xl font-black text-on-secondary-fixed">{value}</p>
    </div>
  );
}

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

export default function ReportesPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const range = useMemo(() => defaultRange(), []);

  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  const [fechaDesde, setFechaDesde] = useState(range.start);
  const [fechaHasta, setFechaHasta] = useState(range.end);
  const [top, setTop] = useState(10);
  const [selectedSedeId, setSelectedSedeId] = useState(usuario?.sedeId ?? '');

  const sedesQuery = useQuery({
    queryKey: ['reportes', 'sedes', usuario?.rol],
    queryFn: getSedes,
    enabled: usuario?.rol === Rol.ADMIN,
  });

  const sedesDisponibles = useMemo(() => {
    if (!usuario) return [] as { id: string; nombre: string }[];
    if (usuario.rol === Rol.ADMIN) {
      return (sedesQuery.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre }));
    }
    return usuario.sedeId ? [{ id: usuario.sedeId, nombre: 'Mi sede' }] : [];
  }, [sedesQuery.data, usuario]);

  const effectiveSedeId = usuario?.rol === Rol.ADMIN ? selectedSedeId : (usuario?.sedeId ?? '');
  const apiSedeId = isUuidV4(effectiveSedeId) ? effectiveSedeId : undefined;

  const baseParams = useMemo(
    () => ({
      fechaDesde,
      fechaHasta,
      ...(apiSedeId ? { sedeId: apiSedeId } : {}),
    }),
    [apiSedeId, fechaDesde, fechaHasta],
  );

  const ventasResumenQuery = useQuery({
    queryKey: ['reportes', 'ventas-resumen', baseParams],
    queryFn: async () => {
      const { data } = await api.get<VentasResumen>('/reportes/ventas/resumen', {
        params: baseParams,
      });
      return data;
    },
  });

  const ventasPorDiaQuery = useQuery({
    queryKey: ['reportes', 'ventas-por-dia', baseParams],
    queryFn: async () => {
      const { data } = await api.get<VentasPorDia>('/reportes/ventas/por-dia', {
        params: baseParams,
      });
      return data;
    },
  });

  const ventasPorCategoriaQuery = useQuery({
    queryKey: ['reportes', 'ventas-por-categoria', baseParams],
    queryFn: async () => {
      const { data } = await api.get<VentasPorCategoria>('/reportes/ventas/por-categoria', {
        params: baseParams,
      });
      return data;
    },
  });

  const productosMasVendidosQuery = useQuery({
    queryKey: ['reportes', 'productos-mas-vendidos', baseParams, top],
    queryFn: async () => {
      const { data } = await api.get<ProductosMasVendidos>(
        '/reportes/ventas/productos-mas-vendidos',
        {
          params: { ...baseParams, top },
        },
      );
      return data;
    },
  });

  const inventarioValorizadoQuery = useQuery({
    queryKey: ['reportes', 'inventario-valorizado', baseParams],
    queryFn: async () => {
      const { data } = await api.get<InventarioValorizado>('/reportes/inventario/valorizado', {
        params: baseParams,
      });
      return data;
    },
  });

  const inventarioAlertasQuery = useQuery({
    queryKey: ['reportes', 'inventario-alertas', baseParams],
    queryFn: async () => {
      const { data } = await api.get<InventarioAlertas>('/reportes/inventario/alertas', {
        params: baseParams,
      });
      return data;
    },
  });

  const inventarioRotacionQuery = useQuery({
    queryKey: ['reportes', 'inventario-rotacion', baseParams],
    queryFn: async () => {
      const { data } = await api.get<InventarioRotacion>('/reportes/inventario/rotacion', {
        params: baseParams,
      });
      return data;
    },
  });

  const clientesNuevosQuery = useQuery({
    queryKey: ['reportes', 'clientes-nuevos', baseParams],
    queryFn: async () => {
      const { data } = await api.get<ClientesNuevos>('/reportes/clientes/nuevos', {
        params: baseParams,
      });
      return data;
    },
  });

  const clientesFrecuentesQuery = useQuery({
    queryKey: ['reportes', 'clientes-frecuentes', baseParams],
    queryFn: async () => {
      const { data } = await api.get<ClientesFrecuentes>('/reportes/clientes/frecuentes', {
        params: baseParams,
      });
      return data;
    },
  });

  const clientesRetencionQuery = useQuery({
    queryKey: ['reportes', 'clientes-retencion', baseParams],
    queryFn: async () => {
      const { data } = await api.get<ClientesRetencion>('/reportes/clientes/retencion', {
        params: baseParams,
      });
      return data;
    },
  });

  const exportarAlertasCSV = () => {
    const rows = inventarioAlertasQuery.data?.alertas ?? [];
    const headers = ['Sede', 'Producto', 'Variante', 'StockActual', 'StockMinimo', 'Deficit'];
    const dataRows = rows.map((row) => [
      row.sede,
      row.producto,
      row.variante,
      String(row.stockActual),
      String(row.stockMinimo),
      String(row.deficit),
    ]);
    const content = [headers, ...dataRows]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alertas-inventario-${toISODate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tabs: Array<{ id: ReportTab; label: string; Icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: Gauge },
    { id: 'ventas', label: 'Ventas', Icon: BarChart3 },
    { id: 'inventario', label: 'Inventario', Icon: Package },
    { id: 'clientes', label: 'Clientes', Icon: Users },
  ];

  const dashboardData = useMemo(
    () => ({
      ventasHoyMonto: ventasResumenQuery.data?.montoTotal ?? 0,
      ventasSemanaMonto: (ventasPorDiaQuery.data?.serie ?? []).reduce(
        (acc, item) => acc + item.montoTotal,
        0,
      ),
      ventasMesMonto: ventasResumenQuery.data?.montoTotal ?? 0,
      alertasStock: inventarioAlertasQuery.data?.total ?? 0,
      topProductos: (productosMasVendidosQuery.data?.porCantidad ?? []).slice(0, 5),
    }),
    [
      inventarioAlertasQuery.data?.total,
      productosMasVendidosQuery.data?.porCantidad,
      ventasPorDiaQuery.data?.serie,
      ventasResumenQuery.data?.montoTotal,
    ],
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Reportes
            </h1>
            <p className="mt-1 text-secondary">
              Conectado a los endpoints actuales de analitica del backend.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2">
              <Calendar size={18} className="text-secondary" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-transparent text-sm font-semibold text-on-surface"
              />
              <span className="text-xs text-secondary">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-transparent text-sm font-semibold text-on-surface"
              />
            </div>
            <select
              value={effectiveSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              disabled={usuario?.rol !== Rol.ADMIN}
              className="min-w-[180px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface"
            >
              <option value="">Todas las sedes</option>
              {sedesDisponibles.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        </header>

        <nav className="flex overflow-x-auto whitespace-nowrap border-b border-outline-variant/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-4 px-5 py-3 text-sm font-bold ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <tab.Icon size={17} />
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            {ventasResumenQuery.isLoading ||
            ventasPorDiaQuery.isLoading ||
            inventarioAlertasQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <StatCard label="Ventas hoy" value={cop.format(dashboardData.ventasHoyMonto)} />
                  <StatCard
                    label="Ventas semana"
                    value={cop.format(dashboardData.ventasSemanaMonto)}
                  />
                  <StatCard label="Ventas mes" value={cop.format(dashboardData.ventasMesMonto)} />
                  <StatCard label="Alertas stock" value={dashboardData.alertasStock.toString()} />
                  <StatCard label="Caja abierta" value="N/D" />
                </div>
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
                  <h3 className="mb-4 text-lg font-bold text-on-secondary-fixed">
                    Top productos del dia
                  </h3>
                  {dashboardData.topProductos.length === 0 ? (
                    <EmptyState
                      title="Sin ventas para hoy"
                      subtitle="No hay datos para mostrar en el ranking diario."
                    />
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dashboardData.topProductos}
                          margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#dac0c5" />
                          <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => [value, 'Unidades']} />
                          <Bar dataKey="cantidadVendida" fill="#85264b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'ventas' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <StatCard
                label="Transacciones"
                value={(ventasResumenQuery.data?.totalVentas ?? 0).toLocaleString('es-CO')}
              />
              <StatCard
                label="Monto total"
                value={cop.format(ventasResumenQuery.data?.montoTotal ?? 0)}
              />
              <StatCard
                label="Ticket promedio"
                value={cop.format(ventasResumenQuery.data?.ticketPromedio ?? 0)}
              />
              <StatCard
                label="Comparativa"
                value={`${(ventasResumenQuery.data?.comparativaPeriodoAnteriorPct ?? 0).toFixed(2)}%`}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
                <h3 className="mb-4 text-lg font-bold text-on-secondary-fixed">Ventas por dia</h3>
                {ventasPorDiaQuery.isLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : (ventasPorDiaQuery.data?.serie.length ?? 0) > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={ventasPorDiaQuery.data?.serie}
                        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dac0c5" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip formatter={(value) => cop.format(Number(value))} />
                        <Line
                          type="monotone"
                          dataKey="montoTotal"
                          stroke="#85264b"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="Sin datos de ventas"
                    subtitle="No hay registros en el rango seleccionado."
                  />
                )}
              </div>

              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
                <h3 className="mb-4 text-lg font-bold text-on-secondary-fixed">
                  Participacion por categoria
                </h3>
                {ventasPorCategoriaQuery.isLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : (ventasPorCategoriaQuery.data?.categorias.length ?? 0) > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ventasPorCategoriaQuery.data?.categorias}
                          dataKey="montoTotal"
                          nameKey="categoria"
                          outerRadius={100}
                          fill="#a43e63"
                        />
                        <Tooltip formatter={(value) => cop.format(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="Sin categorias con ventas"
                    subtitle="No hubo ventas por categoria para este filtro."
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-secondary-fixed">
                  Productos mas vendidos
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-secondary">Top</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={top}
                    onChange={(e) =>
                      setTop(Math.max(1, Math.min(100, Number(e.target.value) || 10)))
                    }
                    className="w-20 rounded-lg border border-outline-variant/30 bg-surface-container px-2 py-1 text-center text-sm"
                  />
                </div>
              </div>
              {productosMasVendidosQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (productosMasVendidosQuery.data?.porCantidad.length ?? 0) > 0 ? (
                <div className="overflow-hidden rounded-xl border border-outline-variant/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-highest text-xs uppercase tracking-widest text-on-surface-variant">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosMasVendidosQuery.data?.porCantidad.map((item) => (
                        <tr key={item.productoId} className="border-t border-outline-variant/10">
                          <td className="px-4 py-3 font-bold text-secondary">{item.posicion}</td>
                          <td className="px-4 py-3 font-semibold text-on-surface">{item.nombre}</td>
                          <td className="px-4 py-3 text-right">{item.cantidadVendida}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {cop.format(item.montoTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Sin ranking de productos"
                  subtitle="Todavia no hay productos para el rango seleccionado."
                />
              )}
            </div>
          </section>
        )}

        {activeTab === 'inventario' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-secondary-fixed">Inventario</h2>
              <button
                onClick={exportarAlertasCSV}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                <Download size={16} />
                Exportar alertas
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-secondary-fixed">
                  <Store size={18} /> Valorizado por sede/categoria
                </h3>
                {inventarioValorizadoQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (inventarioValorizadoQuery.data?.items.length ?? 0) > 0 ? (
                  <div className="max-h-80 overflow-auto rounded-xl border border-outline-variant/10">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-surface-container-highest text-xs uppercase tracking-widest text-on-surface-variant">
                          <th className="px-4 py-3">Sede</th>
                          <th className="px-4 py-3">Categoria</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventarioValorizadoQuery.data?.items.map((item, idx) => (
                          <tr
                            key={`${item.sedeId}-${item.categoriaId ?? 'none'}-${idx}`}
                            className="border-t border-outline-variant/10"
                          >
                            <td className="px-4 py-3 font-semibold">{item.sede || 'N/A'}</td>
                            <td className="px-4 py-3">{item.categoria}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {cop.format(item.valorInventario)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="Sin datos de inventario"
                    subtitle="No hay registros de stock para los filtros actuales."
                  />
                )}
              </div>

              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-secondary-fixed">
                  <AlertTriangle size={18} /> Alertas de stock
                </h3>
                {inventarioAlertasQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (inventarioAlertasQuery.data?.alertas.length ?? 0) > 0 ? (
                  <div className="max-h-80 overflow-auto rounded-xl border border-outline-variant/10">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-surface-container-highest text-xs uppercase tracking-widest text-on-surface-variant">
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3 text-right">Actual</th>
                          <th className="px-4 py-3 text-right">Minimo</th>
                          <th className="px-4 py-3 text-right">Deficit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventarioAlertasQuery.data?.alertas.map((item) => (
                          <tr key={item.stockId} className="border-t border-outline-variant/10">
                            <td className="px-4 py-3 font-semibold">{item.producto}</td>
                            <td className="px-4 py-3 text-right">{item.stockActual}</td>
                            <td className="px-4 py-3 text-right">{item.stockMinimo}</td>
                            <td className="px-4 py-3 text-right font-bold text-error">
                              {item.deficit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="Sin alertas"
                    subtitle="No hay productos por debajo del minimo."
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <h3 className="mb-4 text-lg font-bold text-on-secondary-fixed">Mayor rotacion</h3>
              {inventarioRotacionQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (inventarioRotacionQuery.data?.mayorRotacion.length ?? 0) > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={inventarioRotacionQuery.data?.mayorRotacion.slice(0, 10)}
                      margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#dac0c5" />
                      <XAxis dataKey="producto" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [value, 'Rotacion']} />
                      <Bar dataKey="rotacion" fill="#733266" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  title="Sin datos de rotacion"
                  subtitle="No se pudieron calcular productos con rotacion."
                />
              )}
            </div>
          </section>
        )}

        {activeTab === 'clientes' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <StatCard
                label="Clientes nuevos"
                value={(clientesNuevosQuery.data?.total ?? 0).toString()}
              />
              <StatCard
                label="Frecuentes"
                value={(clientesFrecuentesQuery.data?.top.length ?? 0).toString()}
              />
              <StatCard
                label="Retencion"
                value={`${(clientesRetencionQuery.data?.tasaRetencion ?? 0).toFixed(2)}%`}
              />
            </div>

            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <h3 className="mb-4 text-lg font-bold text-on-secondary-fixed">
                Clientes frecuentes
              </h3>
              {clientesFrecuentesQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (clientesFrecuentesQuery.data?.top.length ?? 0) > 0 ? (
                <div className="overflow-hidden rounded-xl border border-outline-variant/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-highest text-xs uppercase tracking-widest text-on-surface-variant">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-right">Compras</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFrecuentesQuery.data?.top.map((item) => (
                        <tr key={item.clienteId} className="border-t border-outline-variant/10">
                          <td className="px-4 py-3 font-bold text-secondary">{item.posicion}</td>
                          <td className="px-4 py-3 font-semibold text-on-surface">
                            {item.cliente}
                          </td>
                          <td className="px-4 py-3 text-right">{item.compras}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {cop.format(item.montoTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Sin clientes frecuentes"
                  subtitle="No hubo compras con cliente asociado en el periodo."
                />
              )}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
