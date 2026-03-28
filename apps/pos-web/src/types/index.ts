// POS Frontend – Shared TypeScript Types
// Mirroring the shared-types from the backend package

export interface Variante {
  id: string;
  productoId: string;
  nombre: string;
  codigoBarras: string;
  sku: string;
  precioExtra: number;
  precioVenta: number | null;
  precioCosto: number | null;
  imagenUrl?: string;
  activo: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  codigoInterno?: string;
  descripcion?: string;
  imagenUrl?: string;
  categoriaId: string;
  marcaId: string;
  precioBase: number;
  precioCosto: number;
  iva: number;
  activo: boolean;
  variantes?: Variante[];
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  tipoDocumento: string;
  email?: string;
  telefono?: string;
  puntosFidelidad: number;
  activo: boolean;
}

export interface ItemCarrito {
  /** Identity key = varianteId. Falls back to productoId if no variante is selected */
  key: string;
  varianteId: string;
  productoId: string;
  nombre: string;
  variante: string;
  imagenUrl?: string;
  precioUnitario: number;
  cantidad: number;
  /** Discount percentage 0-100 applied to this item */
  descuentoItem: number;
  /** Computed: precioUnitario * cantidad * (1 - descuentoItem/100) */
  subtotal: number;
}

export type MetodoPago =
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA'
  | 'COMBINADO';

export interface SplitPago {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

export interface CreateDetalleVenta {
  varianteId: string;
  cantidad: number;
  descuentoItem?: number;
}

export interface CreateVentaPayload {
  sedeId: string;
  clienteId?: string;
  metodoPago: MetodoPago;
  observaciones?: string;
  descuento?: number;
  splitPago?: SplitPago;
  items: CreateDetalleVenta[];
}

export interface VentaCreada {
  id: string;
  total: number;
  estado: string;
  createdAt: string;
}

export interface Sede {
  id: string;
  nombre: string;
  tipo: string;
}

export interface ProductosPaginados {
  data: Producto[];
  total: number;
  page: number;
  limit: number;
}
