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

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return { start: toISODate(start), end: toISODate(end) };
};

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
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
  const usuario = useAuthStore((state) => state.usuario);
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
    if (!usuario) {
      return [] as Array<{ id: string; nombre: string }>;
    }
    if (usuario.rol === Rol.ADMIN) {
      return (sedesQuery.data ?? []).map((sede) => ({ id: sede.id, nombre: sede.nombre }));
    }
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
    if (!effectiveSedeId) {
      return ventasSedeQuery.data ?? [];
    }

    if (usuario?.rol === Rol.ADMIN) {
      return (ventasSedeQuery.data ?? []).filter(
        (item) => !selectedSedeId || item.sedeId === selectedSedeId,
      );
    }

    return (ventasSedeQuery.data ?? []).filter((item) => item.sedeId === effectiveSedeId);
  }, [effectiveSedeId, selectedSedeId, usuario?.rol, ventasSedeQuery.data]);

  const productosConMargen = useMemo(() => {
    const margenMap = new Map(
      (margenesQuery.data ?? []).map((item) => [item.productoId, item.margenPorcentaje]),
    );
    return (productosMasVendidosQuery.data ?? []).map((item) => ({
      ...item,
      margenPorcentaje: margenMap.get(item.productoId) ?? 0,
    }));
  }, [productosMasVendidosQuery.data, margenesQuery.data]);

  const stockFiltrado = useMemo(() => {
    const base = stockQuery.data ?? [];
    if (!soloBajoMinimo) {
      return base;
    }
    return base.filter((item) => item.cantidad <= item.stockMinimo);
  }, [soloBajoMinimo, stockQuery.data]);

  const exportarStockCSV = () => {
    const headers = ['Producto', 'Variante', 'SedeId', 'StockActual', 'StockMinimo', 'Alerta'];
    const rows = stockFiltrado.map((item) => [
      item.nombreProducto,
      item.nombreVariante,
      item.sedeId,
      String(item.cantidad),
      String(item.stockMinimo),
      item.alerta ? 'SI' : 'NO',
    ]);

    const content = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-reporte-${effectiveSedeId || 'general'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tabs: Array<{ id: ReportTab; label: string }> = [
    { id: 'ventas-periodo', label: 'Ventas por periodo' },
    { id: 'productos-vendidos', label: 'Productos mas vendidos' },
    { id: 'inventario-stock', label: 'Inventario y Stock' },
    { id: 'clientes-frecuentes', label: 'Clientes frecuentes' },
    { id: 'cierre-caja', label: 'Cierre de caja' },
  ];

  const nivelCliente = (compras: number) => {
    if (compras < 5) {
      return { label: 'BRONCE', classes: 'bg-amber-100 text-amber-700' };
    }
    if (compras <= 15) {
      return { label: 'PLATA', classes: 'bg-slate-100 text-slate-700' };
    }
    return { label: 'ORO', classes: 'bg-yellow-100 text-yellow-700' };
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-indigo-900">Reportes y analitica</h1>
              <p className="text-sm text-indigo-700/70">
                Vista consolidada para decision operativa.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-indigo-800">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-indigo-800">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-indigo-800">
                  Sede
                </label>
                <select
                  value={effectiveSedeId}
                  onChange={(e) => setSelectedSedeId(e.target.value)}
                  disabled={usuario?.rol !== Rol.ADMIN}
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm"
                >
                  {sedesDisponibles.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'ventas-periodo' && (
          <section className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium text-indigo-900">Ventas por periodo</h2>

            {ventasSedeQuery.isLoading ? (
              <>
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <BarChart data={ventasSedeFiltradas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombreSede" />
                      <YAxis tickFormatter={(value) => copFormatter.format(Number(value ?? 0))} />
                      <Tooltip formatter={(value) => copFormatter.format(Number(value ?? 0))} />
                      <Bar dataKey="totalVentas" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-indigo-50 text-indigo-900">
                    <tr>
                      <th className="px-4 py-3 text-left">Sede</th>
                      <th className="px-4 py-3 text-left">Total ventas</th>
                      <th className="px-4 py-3 text-left">Transacciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasSedeFiltradas.map((item) => (
                      <tr key={item.sedeId} className="border-t border-indigo-100">
                        <td className="px-4 py-3">{item.nombreSede}</td>
                        <td className="px-4 py-3">{copFormatter.format(item.totalVentas)}</td>
                        <td className="px-4 py-3">{item.cantidadTransacciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {activeTab === 'productos-vendidos' && (
          <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="text-lg font-medium text-emerald-900">Productos mas vendidos</h2>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-emerald-800">
                  Limite
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 10))}
                  className="w-28 rounded-lg border border-emerald-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {productosMasVendidosQuery.isLoading || margenesQuery.isLoading ? (
              <>
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={productosConMargen.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="nombre" width={200} />
                      <Tooltip />
                      <Bar dataKey="totalUnidades" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-emerald-50 text-emerald-900">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Unidades</th>
                      <th className="px-4 py-3 text-left">Revenue</th>
                      <th className="px-4 py-3 text-left">Margen %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosConMargen.map((item, index) => (
                      <tr key={item.productoId} className="border-t border-emerald-100">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3">{item.nombre}</td>
                        <td className="px-4 py-3">{item.totalUnidades}</td>
                        <td className="px-4 py-3">{copFormatter.format(item.totalRevenue)}</td>
                        <td className="px-4 py-3">{item.margenPorcentaje.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {activeTab === 'inventario-stock' && (
          <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-medium text-amber-900">Inventario y stock</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoloBajoMinimo((prev) => !prev)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    soloBajoMinimo
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  Ver solo bajo minimo
                </button>
                <button
                  onClick={exportarStockCSV}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            {stockQuery.isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-amber-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-left">Variante</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-left">Minimo</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.map((item) => (
                    <tr
                      key={`${item.sedeId}-${item.varianteId}`}
                      className="border-t border-amber-100"
                    >
                      <td className="px-4 py-3">{item.nombreProducto}</td>
                      <td className="px-4 py-3">{item.nombreVariante}</td>
                      <td className="px-4 py-3">{item.cantidad}</td>
                      <td className="px-4 py-3">{item.stockMinimo}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            item.alerta
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.alerta ? 'Alerta' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'clientes-frecuentes' && (
          <section className="space-y-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium text-violet-900">Clientes frecuentes</h2>

            {clientesQuery.isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-violet-50 text-violet-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Posicion</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Documento</th>
                    <th className="px-4 py-3 text-left">Compras</th>
                    <th className="px-4 py-3 text-left">Total gastado</th>
                    <th className="px-4 py-3 text-left">Puntos</th>
                    <th className="px-4 py-3 text-left">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {(clientesQuery.data ?? []).map((item, index) => {
                    const nivel = nivelCliente(item.totalCompras);
                    return (
                      <tr key={item.clienteId} className="border-t border-violet-100">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3">{item.nombre}</td>
                        <td className="px-4 py-3">{item.documento}</td>
                        <td className="px-4 py-3">{item.totalCompras}</td>
                        <td className="px-4 py-3">{copFormatter.format(item.totalGastado)}</td>
                        <td className="px-4 py-3">{item.puntosAcumulados}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${nivel.classes}`}
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
          </section>
        )}

        {activeTab === 'cierre-caja' && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="max-w-xs">
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-700">
                Fecha cierre
              </label>
              <input
                type="date"
                value={fechaCaja}
                onChange={(e) => setFechaCaja(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {cierreCajaQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : cierreCajaQuery.data ? (
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-lg font-medium text-slate-900">Resumen cierre de caja</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <p className="text-sm text-slate-700">
                    Monto inicial: {copFormatter.format(Number(cierreCajaQuery.data.montoInicial))}
                  </p>
                  <p className="text-sm text-slate-700">
                    Ventas: {copFormatter.format(Number(cierreCajaQuery.data.totalVentas))}
                  </p>
                  <p className="text-sm text-slate-700">
                    Efectivo: {copFormatter.format(Number(cierreCajaQuery.data.totalEfectivo))}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      Number(cierreCajaQuery.data.diferencia) >= 0
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    Diferencia: {copFormatter.format(Number(cierreCajaQuery.data.diferencia))}
                  </p>
                </div>
              </article>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                No hay cierre de caja para la fecha seleccionada.
              </p>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
