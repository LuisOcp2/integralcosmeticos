-- Fase: Ordenes de compra (backend apps/backend/src/modules/orden-compras)
-- Objetivo: crear tablas faltantes para habilitar CRUD de ordenes_compra

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'estado_orden_compra'
  ) THEN
    CREATE TYPE estado_orden_compra AS ENUM (
      'BORRADOR',
      'ENVIADA',
      'RECIBIDA_PARCIAL',
      'RECIBIDA_TOTAL',
      'CANCELADA'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) UNIQUE NOT NULL,
  "proveedorId" UUID NOT NULL REFERENCES proveedores(id),
  "sedeId" UUID NOT NULL REFERENCES sedes(id),
  estado estado_orden_compra NOT NULL DEFAULT 'BORRADOR',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  "fechaEsperada" DATE,
  "fechaRecepcion" TIMESTAMPTZ,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "recibidoPorId" UUID REFERENCES usuarios(id),
  notas TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalles_orden_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ordenId" UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  "varianteId" UUID NOT NULL REFERENCES variantes(id),
  "cantidadPedida" INTEGER NOT NULL CHECK ("cantidadPedida" > 0),
  "cantidadRecibida" INTEGER NOT NULL DEFAULT 0 CHECK ("cantidadRecibida" >= 0),
  "precioUnitario" DECIMAL(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_numero ON ordenes_compra(numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra("proveedorId");
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_sede ON ordenes_compra("sedeId");
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_orden_orden ON detalles_orden_compra("ordenId");
CREATE INDEX IF NOT EXISTS idx_detalle_orden_variante ON detalles_orden_compra("varianteId");
