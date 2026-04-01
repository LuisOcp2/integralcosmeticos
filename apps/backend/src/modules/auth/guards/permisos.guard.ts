import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';
import { Permiso, PERMISOS_POR_ROL, Rol } from '@cosmeticos/shared-types';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permisosRequeridos = this.reflector.getAllAndOverride<Permiso[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permisosRequeridos || permisosRequeridos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const permisosDelRol = PERMISOS_POR_ROL[user.rol as Rol] ?? [];
    const permisosExtra = user.permisosExtra ?? [];
    const permisosRevocados = new Set(user.permisosRevocados ?? []);

    const permisosEfectivos = new Set(
      [...permisosDelRol, ...permisosExtra].filter((p) => !permisosRevocados.has(p)),
    );

    const tienePermiso = permisosRequeridos.every((p) => permisosEfectivos.has(p));

    if (!tienePermiso) {
      throw new ForbiddenException(
        `Permisos insuficientes. Se requiere: ${permisosRequeridos.join(', ')}`,
      );
    }

    return true;
  }
}
