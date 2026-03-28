export interface IVariante {
  id: string;
  productoId: string;
  nombre: string;
  codigoBarras: string;
  sku: string;
  precioExtra: number;
  precioVenta?: number | null;
  precioCosto?: number | null;
  imagenUrl?: string;
  activo: boolean;
}
