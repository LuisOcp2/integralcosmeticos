import { TipoSede } from '../enums';

export interface ISede {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono?: string;
  responsable?: string;
  tipo: TipoSede;
  moneda?: string;
  impuestoPorcentaje?: number;
  activo: boolean;
  createdAt: Date;
}
