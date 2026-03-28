export interface ITipoDocumentoConfiguracion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IParametroConfiguracion {
  id: string;
  clave: string;
  valor?: string | null;
  descripcion?: string;
  tipoDato: string;
  modulo?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
