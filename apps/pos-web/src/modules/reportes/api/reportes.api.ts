import { apiClient } from '@/lib/api';

export type ReportesFiltros = {
  sedeId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

export type DashboardReport = {
  moneda: 'COP';
  ventasHoy: { cantidad: number; monto: number };
  ventasSemana: { cantidad: number; monto: number };
  ventasMes: { cantidad: number; monto: number };
  alertasStock: number;
  cajaAbierta: boolean;
  top5ProductosDelDia: Array<{
    posicion: number;
    productoId: string;
    producto: string;
    cantidad: number;
    monto: number;
  }>;
  ultimaVenta: {
    ventaId: string;
    numero: string;
    fecha: string;
    total: number;
    metodoPago: string;
    cajero: string | null;
    cliente: string | null;
  } | null;
};

export type VentasResumenReport = {
  totalVentas: number;
  montoTotal: number;
  ticketPromedio: number;
  comparativaPeriodoAnteriorPct: number;
  porMetodoPago: Array<{
    metodoPago: string;
    cantidad: number;
    montoTotal: number;
  }>;
  moneda: 'COP';
};

export type VentasPorDiaReport = {
  moneda: 'COP';
  serie: Array<{ fecha: string; totalVentas: number; montoTotal: number }>;
};

export type VentasPorCategoriaReport = {
  moneda: 'COP';
  categorias: Array<{
    categoriaId: string | null;
    categoria: string;
    cantidadVendida: number;
    montoTotal: number;
  }>;
};

export type InventarioAlertasReport = {
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

const toParams = (filtros?: ReportesFiltros) => ({
  sedeId: filtros?.sedeId,
  fechaDesde: filtros?.fechaDesde,
  fechaHasta: filtros?.fechaHasta,
});

export const reportesApi = {
  dashboard: (filtros?: ReportesFiltros) =>
    apiClient
      .get<DashboardReport>('/reportes/dashboard', { params: toParams(filtros) })
      .then((r) => r.data),

  ventasResumen: (filtros?: ReportesFiltros) =>
    apiClient
      .get<VentasResumenReport>('/reportes/ventas/resumen', { params: toParams(filtros) })
      .then((r) => r.data),

  ventasPorDia: (filtros?: ReportesFiltros) =>
    apiClient
      .get<VentasPorDiaReport>('/reportes/ventas/por-dia', { params: toParams(filtros) })
      .then((r) => r.data),

  ventasPorCategoria: (filtros?: ReportesFiltros) =>
    apiClient
      .get<VentasPorCategoriaReport>('/reportes/ventas/por-categoria', {
        params: toParams(filtros),
      })
      .then((r) => r.data),

  inventarioAlertas: (filtros?: ReportesFiltros) =>
    apiClient
      .get<InventarioAlertasReport>('/reportes/inventario/alertas', { params: toParams(filtros) })
      .then((r) => r.data),

  exportarVentasExcel: (filtros?: ReportesFiltros) =>
    apiClient
      .get('/reportes/ventas/exportar-excel', {
        params: toParams(filtros),
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),
};
