import { TipoSede } from '../enums';

export interface ISede {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono?: string;
  tipo: TipoSede;
  activo: boolean;
  createdAt: Date;
}
