import { TipoMovimiento } from '../enums';

export interface IStockSede {
  id: string;
  varianteId: string;
  sedeId: string;
  cantidad: number;
  stockMinimo: number;
}

export interface IMovimientoInventario {
  id: string;
  tipo: TipoMovimiento;
  varianteId: string;
  sedeId: string;
  cantidad: number;
  sedeDestinoId?: string | null;
  usuarioId: string;
  motivo?: string;
  createdAt: Date;
}
