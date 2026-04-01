import { Rol } from '@cosmeticos/shared-types';

export const PERMISSIONS = {
  USUARIOS_CREAR: 'usuarios.crear',
  USUARIOS_VER: 'usuarios.ver',
  USUARIOS_EDITAR: 'usuarios.editar',
  USUARIOS_CAMBIAR_ESTADO: 'usuarios.cambiar_estado',
  SEDES_VER: 'sedes.ver',
  SEDES_EDITAR: 'sedes.editar',
  INVENTARIO_VER: 'inventario.ver',
  INVENTARIO_OPERAR: 'inventario.operar',
  VENTAS_VER: 'ventas.ver',
  VENTAS_CREAR: 'ventas.crear',
  REPORTES_VER: 'reportes.ver',
  CONFIG_VER: 'configuraciones.ver',
  CONFIG_EDITAR: 'configuraciones.editar',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ADMIN_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<Rol, PermissionKey[]> = {
  [Rol.ADMIN]: ADMIN_PERMISSIONS,
  [Rol.SUPERVISOR]: [
    PERMISSIONS.USUARIOS_VER,
    PERMISSIONS.SEDES_VER,
    PERMISSIONS.INVENTARIO_VER,
    PERMISSIONS.INVENTARIO_OPERAR,
    PERMISSIONS.VENTAS_VER,
    PERMISSIONS.VENTAS_CREAR,
    PERMISSIONS.REPORTES_VER,
    PERMISSIONS.CONFIG_VER,
  ],
  [Rol.CAJERO]: [
    PERMISSIONS.SEDES_VER,
    PERMISSIONS.INVENTARIO_VER,
    PERMISSIONS.VENTAS_VER,
    PERMISSIONS.VENTAS_CREAR,
  ],
  [Rol.BODEGUERO]: [
    PERMISSIONS.SEDES_VER,
    PERMISSIONS.INVENTARIO_VER,
    PERMISSIONS.INVENTARIO_OPERAR,
  ],
};

export function getPermissionsByRole(role: Rol): PermissionKey[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
