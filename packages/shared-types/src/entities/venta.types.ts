import { EstadoVenta, MetodoPago } from '../enums';

export interface IVenta {
  id: string;
  numero: string; // ej: 'VTA-2026-00001'
  sedeId: string;
  usuarioId: string; // cajero
  clienteId?: string;
  items: IDetalleVenta[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  metodoPago: MetodoPago;
  estado: EstadoVenta;
  observaciones?: string;
  createdAt: Date;
}

export interface IDetalleVenta {
  id: string;
  ventaId: string;
  varianteId: string;
  cantidad: number;
  precioUnitario: number;
  descuentoItem: number;
  subtotal: number;
}

export interface ICierreCaja {
  id: string;
  sedeId: string;
  usuarioId: string;
  fechaApertura: Date;
  fechaCierre?: Date;
  montoInicial: number;
  montoFinal?: number;
  totalVentas: number;
  totalEfectivo: number;
  diferencia?: number;
}
