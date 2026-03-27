import { TipoDocumento } from '../enums';

export interface ICliente {
  id: string;
  nombre: string;
  apellido: string;
  documento: string; // CC, NIT, Pasaporte
  tipoDocumento: TipoDocumento;
  email?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: Date;
  puntosFidelidad: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
