import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@cosmeticos/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Jerarquía numérica: mayor número = mayor privilegio */
const JERARQUIA: Record<Rol, number> = {
  [Rol.ADMIN]: 3,
  [Rol.SUPERVISOR]: 2,
  [Rol.CAJERO]: 1,
  [Rol.BODEGUERO]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.rol || user.activo === false) {
      return false;
    }

    const nivelUsuario = JERARQUIA[user.rol as Rol] ?? 0;

    // Pasa si el usuario tiene al menos el nivel mínimo entre los roles requeridos
    // o si es exactamente uno de los roles requeridos
    return requiredRoles.some(
      (rol) => nivelUsuario >= JERARQUIA[rol] || user.rol === rol,
    );
  }
}
