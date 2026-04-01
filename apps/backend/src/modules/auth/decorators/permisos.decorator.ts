import { SetMetadata } from '@nestjs/common';
import { Permiso } from '@cosmeticos/shared-types';

export const PERMISOS_KEY = 'permisos';
export const Permisos = (...permisos: Permiso[]) => SetMetadata(PERMISOS_KEY, permisos);
