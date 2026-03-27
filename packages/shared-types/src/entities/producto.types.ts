export interface ICategoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface IMarca {
  id: string;
  nombre: string;
  logoUrl?: string;
}

export interface IProducto {
  id: string;
  nombre: string;
  descripcion?: string;
  codigoInterno: string;
  categoriaId: string;
  categoria?: ICategoria;
  marcaId: string;
  marca?: IMarca;
  precioVenta: number;
  precioCosto: number;
  impuesto: number; // porcentaje IVA
  imagenUrl?: string;
  activo: boolean;
  variantes?: IVariante[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariante {
  id: string;
  productoId: string;
  nombre: string; // ej: 'Tono Nude', 'Talla 50ml'
  codigoBarras: string;
  sku: string;
  precioExtra: number; // precio adicional sobre el base
  activa: boolean;
}
