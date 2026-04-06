import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Permiso } from '@cosmeticos/shared-types';
import toast from 'react-hot-toast';
import { reportesApi } from '../api/reportes.api';
import { usePermisos } from '@/modules/usuarios/hooks/usePermisos';

type Props = {
  sedeId: string;
};

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportesPage({ sedeId }: Props) {
  const { tienePermiso } = usePermisos();
  const [fechaDesde, setFechaDesde] = useState(() =>
    toInputDate(new Date(Date.now() - 6 * 86400000)),
  );
  const [fechaHasta, setFechaHasta] = useState(() => toInputDate(new Date()));

  const filtros = useMemo(
    () => ({
      sedeId,
      fechaDesde,
      fechaHasta,
    }),
    [sedeId, fechaDesde, fechaHasta],
  );

  const dashboardQuery = useQuery({
    queryKey: ['reportes', 'dashboard', filtros],
    queryFn: () => reportesApi.dashboard(filtros),
  });

  const resumenQuery = useQuery({
    queryKey: ['reportes', 'ventas-resumen', filtros],
    queryFn: () => reportesApi.ventasResumen(filtros),
  });

  const ventasPorDiaQuery = useQuery({
    queryKey: ['reportes', 'ventas-por-dia', filtros],
    queryFn: () => reportesApi.ventasPorDia(filtros),
  });

  const ventasPorCategoriaQuery = useQuery({
    queryKey: ['reportes', 'ventas-por-categoria', filtros],
    queryFn: () => reportesApi.ventasPorCategoria(filtros),
  });

  const alertasQuery = useQuery({
    queryKey: ['reportes', 'inventario-alertas', filtros],
    queryFn: () => reportesApi.inventarioAlertas(filtros),
  });

  const isLoading =
    dashboardQuery.isLoading ||
    resumenQuery.isLoading ||
    ventasPorDiaQuery.isLoading ||
    ventasPorCategoriaQuery.isLoading ||
    alertasQuery.isLoading;

  const hasError =
    dashboardQuery.isError ||
    resumenQuery.isError ||
    ventasPorDiaQuery.isError ||
    ventasPorCategoriaQuery.isError ||
    alertasQuery.isError;

  const canExport = tienePermiso(Permiso.REPORTES_EXPORTAR);

  const handleExportExcel = async () => {
    if (!canExport) {
      return;
    }
    try {
      const blob = await reportesApi.exportarVentasExcel(filtros);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `reporte-ventas-${fechaDesde}-${fechaHasta}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado correctamente');
    } catch {
      toast.error('No fue posible exportar el Excel');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">Reportes</h1>
            <p className="text-sm text-on-surface-variant">
              Vista consolidada de ventas e inventario para la sede actual.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-on-surface-variant">
              Fecha desde
              <input
                type="date"
                value={fechaDesde}
                max={fechaHasta}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-on-background"
              />
            </label>
            <label className="text-sm text-on-surface-variant">
              Fecha hasta
              <input
                type="date"
                value={fechaHasta}
                min={fechaDesde}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-on-background"
              />
            </label>
            <button
              type="button"
              disabled={!canExport}
              onClick={() => {
                void handleExportExcel();
              }}
              className="h-11 self-end rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
              title={canExport ? 'Exportar reporte de ventas' : 'No tienes permiso para exportar'}
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-on-surface-variant">Cargando reportes...</div>
        ) : null}
        {hasError ? (
          <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
            No se pudieron cargar todos los reportes. Intenta de nuevo.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <p className="text-xs text-on-surface-variant">Ventas hoy</p>
            <p className="mt-1 text-xl font-extrabold text-on-background">
              {formatCOP(dashboardQuery.data?.ventasHoy.monto ?? 0)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {dashboardQuery.data?.ventasHoy.cantidad ?? 0} transacciones
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <p className="text-xs text-on-surface-variant">Ventas semana</p>
            <p className="mt-1 text-xl font-extrabold text-on-background">
              {formatCOP(dashboardQuery.data?.ventasSemana.monto ?? 0)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {dashboardQuery.data?.ventasSemana.cantidad ?? 0} transacciones
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <p className="text-xs text-on-surface-variant">Ventas mes</p>
            <p className="mt-1 text-xl font-extrabold text-on-background">
              {formatCOP(dashboardQuery.data?.ventasMes.monto ?? 0)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {dashboardQuery.data?.ventasMes.cantidad ?? 0} transacciones
            </p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <p className="text-xs text-on-surface-variant">Alertas de stock</p>
            <p className="mt-1 text-xl font-extrabold text-on-background">
              {dashboardQuery.data?.alertasStock ?? 0}
            </p>
            <p className="text-xs text-on-surface-variant">
              Caja {dashboardQuery.data?.cajaAbierta ? 'abierta' : 'cerrada'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Resumen de ventas</h2>
            <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
              <p>Total ventas: {resumenQuery.data?.totalVentas ?? 0}</p>
              <p>Monto total: {formatCOP(resumenQuery.data?.montoTotal ?? 0)}</p>
              <p>Ticket promedio: {formatCOP(resumenQuery.data?.ticketPromedio ?? 0)}</p>
              <p>
                Comparativa periodo anterior:{' '}
                {resumenQuery.data?.comparativaPeriodoAnteriorPct ?? 0}%
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Top 5 productos del dia</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(dashboardQuery.data?.top5ProductosDelDia ?? []).map((item) => (
                <div
                  key={item.productoId}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"
                >
                  <span className="text-on-background">
                    {item.posicion}. {item.producto}
                  </span>
                  <span className="text-on-surface-variant">{item.cantidad} uds</span>
                </div>
              ))}
              {(dashboardQuery.data?.top5ProductosDelDia ?? []).length === 0 ? (
                <p className="text-on-surface-variant">Sin ventas en el rango seleccionado.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Ventas por dia</h2>
            <div className="mt-3 max-h-72 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Ventas</th>
                    <th className="px-2 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventasPorDiaQuery.data?.serie ?? []).map((row) => (
                    <tr key={row.fecha} className="border-t border-outline-variant">
                      <td className="px-2 py-2 text-on-background">
                        {new Date(row.fecha).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-2 py-2 text-on-surface-variant">{row.totalVentas}</td>
                      <td className="px-2 py-2 text-right font-semibold text-on-background">
                        {formatCOP(row.montoTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface p-4">
            <h2 className="text-lg font-bold text-on-background">Ventas por categoria</h2>
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {(ventasPorCategoriaQuery.data?.categorias ?? []).map((cat) => (
                <div key={cat.categoriaId ?? cat.categoria} className="rounded-xl bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-on-background">{cat.categoria}</p>
                    <p className="text-sm text-on-surface-variant">{cat.cantidadVendida} uds</p>
                  </div>
                  <p className="text-sm font-semibold text-primary">{formatCOP(cat.montoTotal)}</p>
                </div>
              ))}
              {(ventasPorCategoriaQuery.data?.categorias ?? []).length === 0 ? (
                <p className="text-sm text-on-surface-variant">No hay categorias con ventas.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface p-4">
          <h2 className="text-lg font-bold text-on-background">Alertas de inventario</h2>
          <p className="text-sm text-on-surface-variant">
            Total alertas: {alertasQuery.data?.total ?? 0}
          </p>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Sede</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Minimo</th>
                  <th className="px-2 py-2">Deficit</th>
                </tr>
              </thead>
              <tbody>
                {(alertasQuery.data?.alertas ?? []).map((alerta) => (
                  <tr key={alerta.stockId} className="border-t border-outline-variant">
                    <td className="px-2 py-2 text-on-background">{alerta.producto}</td>
                    <td className="px-2 py-2 text-on-surface-variant">{alerta.sede}</td>
                    <td className="px-2 py-2 text-on-surface-variant">{alerta.stockActual}</td>
                    <td className="px-2 py-2 text-on-surface-variant">{alerta.stockMinimo}</td>
                    <td className="px-2 py-2 font-semibold text-error">{alerta.deficit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
