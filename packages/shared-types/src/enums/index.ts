export enum Rol {
  ADMIN = 'ADMIN',
  CAJERO = 'CAJERO',
  BODEGUERO = 'BODEGUERO',
  SUPERVISOR = 'SUPERVISOR',
}

export enum Permiso {
  USUARIOS_VER = 'usuarios:ver',
  USUARIOS_CREAR = 'usuarios:crear',
  USUARIOS_EDITAR = 'usuarios:editar',
  USUARIOS_ELIMINAR = 'usuarios:eliminar',
  USUARIOS_CAMBIAR_ROL = 'usuarios:cambiar_rol',
  USUARIOS_RESET_PASSWORD = 'usuarios:reset_password',
  USUARIOS_VER_AUDITORIA = 'usuarios:ver_auditoria',

  VENTAS_VER = 'ventas:ver',
  VENTAS_CREAR = 'ventas:crear',
  VENTAS_ANULAR = 'ventas:anular',
  VENTAS_VER_TODAS_SEDES = 'ventas:ver_todas_sedes',

  INVENTARIO_VER = 'inventario:ver',
  INVENTARIO_AJUSTAR = 'inventario:ajustar',
  INVENTARIO_TRASLADAR = 'inventario:trasladar',

  CAJA_ABRIR = 'caja:abrir',
  CAJA_CERRAR = 'caja:cerrar',
  CAJA_VER_HISTORIAL = 'caja:ver_historial',

  REPORTES_VER = 'reportes:ver',
  REPORTES_EXPORTAR = 'reportes:exportar',

  CATALOGO_VER = 'catalogo:ver',
  CATALOGO_CREAR = 'catalogo:crear',
  CATALOGO_EDITAR = 'catalogo:editar',
  CATALOGO_ELIMINAR = 'catalogo:eliminar',

  CONFIG_VER = 'config:ver',
  CONFIG_EDITAR = 'config:editar',
  CONFIG_SEDES = 'config:sedes',
}

export const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  [Rol.ADMIN]: Object.values(Permiso),
  [Rol.SUPERVISOR]: [
    Permiso.USUARIOS_VER,
    Permiso.VENTAS_VER,
    Permiso.VENTAS_CREAR,
    Permiso.VENTAS_ANULAR,
    Permiso.VENTAS_VER_TODAS_SEDES,
    Permiso.INVENTARIO_VER,
    Permiso.INVENTARIO_AJUSTAR,
    Permiso.INVENTARIO_TRASLADAR,
    Permiso.CAJA_ABRIR,
    Permiso.CAJA_CERRAR,
    Permiso.CAJA_VER_HISTORIAL,
    Permiso.REPORTES_VER,
    Permiso.REPORTES_EXPORTAR,
    Permiso.CATALOGO_VER,
    Permiso.CATALOGO_CREAR,
    Permiso.CATALOGO_EDITAR,
    Permiso.CONFIG_VER,
  ],
  [Rol.CAJERO]: [
    Permiso.VENTAS_VER,
    Permiso.VENTAS_CREAR,
    Permiso.CAJA_ABRIR,
    Permiso.CAJA_CERRAR,
    Permiso.CATALOGO_VER,
    Permiso.INVENTARIO_VER,
  ],
  [Rol.BODEGUERO]: [
    Permiso.INVENTARIO_VER,
    Permiso.INVENTARIO_AJUSTAR,
    Permiso.INVENTARIO_TRASLADAR,
    Permiso.CATALOGO_VER,
    Permiso.VENTAS_VER,
  ],
};

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
  DEVOLUCION = 'DEVOLUCION',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  COMBINADO = 'COMBINADO',
}

export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  TRASLADO = 'TRASLADO',
  AJUSTE = 'AJUSTE',
  DEVOLUCION = 'DEVOLUCION',
}

export enum EstadoSyncCloud {
  PENDIENTE = 'PENDIENTE',
  SINCRONIZADO = 'SINCRONIZADO',
  ERROR = 'ERROR',
}

export enum TipoSede {
  TIENDA = 'TIENDA',
  BODEGA = 'BODEGA',
  PRINCIPAL = 'PRINCIPAL',
}

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export enum TipoDocumento {
  CC = 'CC',
  NIT = 'NIT',
  PASAPORTE = 'PASAPORTE',
}
