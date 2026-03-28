import { IVariante } from './variante.types';

export interface IProducto {
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
  variantes?: IVariante[];
}
