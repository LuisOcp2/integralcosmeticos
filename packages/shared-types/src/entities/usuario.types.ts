import { Rol } from '../enums';

export interface IUsuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  sedeId: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  accessToken: string;
  usuario: Omit<IUsuario, 'createdAt' | 'updatedAt'>;
}
