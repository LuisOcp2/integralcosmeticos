export interface IDesgloseMetodoPago {
  metodoPago: string;
  total: number;
  cantidadTransacciones: number;
}

export interface IResumenVentasDia {
  totalVentas: number;
  cantidadTransacciones: number;
  promedioTicket: number;
  comparativoDiaAnterior: number;
  desglosePorMetodoPago: IDesgloseMetodoPago[];
}

export interface IVentasPorSede {
  sedeId: string;
  nombreSede: string;
  totalVentas: number;
  cantidadTransacciones: number;
}

export interface IProductoMasVendido {
  productoId: string;
  nombre: string;
  totalUnidades: number;
  totalRevenue: number;
}

export interface IMargenProducto {
  productoId: string;
  nombre: string;
  costoTotal: number;
  revenueTotal: number;
  margenPorcentaje: number;
}

export interface IStockReporte {
  varianteId: string;
  nombreVariante: string;
  nombreProducto: string;
  sedeId: string;
  cantidad: number;
  stockMinimo: number;
  alerta: boolean;
}

export interface IClienteFrecuente {
  clienteId: string;
  nombre: string;
  documento: string;
  totalCompras: number;
  totalGastado: number;
  puntosAcumulados: number;
}

export interface IResumenCierreCaja {
  cajaId: string;
  montoInicial: number;
  montoFinal: number;
  totalVentas: number;
  totalEfectivo: number;
  diferencia: number;
  usuario: string;
  fecha: Date;
}
