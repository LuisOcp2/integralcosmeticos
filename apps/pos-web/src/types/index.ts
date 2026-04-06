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
  descuento?: number;
}

export interface CreateVentaPayload {
  clienteId?: string;
  metodoPago: MetodoPago;
  montoPagado: number;
  notas?: string;
  items: CreateDetalleVenta[];
}

export interface VentaCreada {
  id: string;
  total: number;
  estado: string;
  createdAt: string;
}

export interface VentaCaja {
  id: string;
  numero: string;
  total: number;
  metodoPago: MetodoPago;
  createdAt: string;
}

export interface CajaSesion {
  id: string;
  sedeId: string;
  cajeroId: string;
  usuarioId: string;
  fechaApertura: string;
  fechaCierre?: string | null;
  montoApertura: number;
  montoInicial: number;
  montoCierre?: number | null;
  montoFinal?: number | null;
  montoSistema?: number | null;
  totalVentas: number;
  totalEfectivo: number;
  diferencia?: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sede {
  id: string;
  nombre: string;
  tipo: string;
}

export interface ProductosPaginados {
  data: Producto[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UsuarioListado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  sedeId?: string | null;
  activo: boolean;
  createdAt: string;
}

export interface UsuariosPaginados {
  data: UsuarioListado[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
