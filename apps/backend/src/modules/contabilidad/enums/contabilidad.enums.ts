export enum TipoCuentaContable {
  ACTIVO = 'ACTIVO',
  PASIVO = 'PASIVO',
  PATRIMONIO = 'PATRIMONIO',
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  COSTO = 'COSTO',
}

export enum TipoAsientoContable {
  VENTA = 'VENTA',
  COMPRA = 'COMPRA',
  AJUSTE_INVENTARIO = 'AJUSTE_INVENTARIO',
  APERTURA = 'APERTURA',
  CIERRE = 'CIERRE',
  MANUAL = 'MANUAL',
}

export enum TipoMovimientoContable {
  DEBITO = 'DEBITO',
  CREDITO = 'CREDITO',
}

export enum EstadoPeriodoContable {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
}
