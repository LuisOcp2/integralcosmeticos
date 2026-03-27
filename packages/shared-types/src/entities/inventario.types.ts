import { TipoMovimiento } from '../enums';

export interface ISede {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono?: string;
  activa: boolean;
}

export interface IStock {
  id: string;
  varianteId: string;
  sedeId: string;
  sede?: ISede;
  cantidad: number;
  stockMinimo: number;
  stockMaximo: number;
  ultimaActualizacion: Date;
}

export interface IMovimientoInventario {
  id: string;
  varianteId: string;
  sedeOrigenId?: string;
  sedeDestinoId?: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string;
  usuarioId: string;
  createdAt: Date;
}
