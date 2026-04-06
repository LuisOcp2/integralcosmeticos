-- ============================================================================
-- Migracion: Esquema Comercial (cotizaciones, pedidos, facturas, pagos)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comercial_estado_cotizacion_enum') THEN
    CREATE TYPE comercial_estado_cotizacion_enum AS ENUM (
      'BORRADOR',
      'ENVIADA',
      'ACEPTADA',
      'RECHAZADA',
      'VENCIDA',
      'CONVERTIDA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comercial_estado_pedido_enum') THEN
    CREATE TYPE comercial_estado_pedido_enum AS ENUM (
      'PENDIENTE',
      'CONFIRMADO',
      'EN_PREPARACION',
      'LISTO',
      'DESPACHADO',
      'ENTREGADO',
      'CANCELADO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comercial_estado_factura_enum') THEN
    CREATE TYPE comercial_estado_factura_enum AS ENUM (
      'BORRADOR',
      'EMITIDA',
      'ENVIADA',
      'PAGADA',
      'PAGADA_PARCIAL',
      'VENCIDA',
      'ANULADA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comercial_metodo_pago_enum') THEN
    CREATE TYPE comercial_metodo_pago_enum AS ENUM (
      'EFECTIVO',
      'TARJETA_CREDITO',
      'TARJETA_DEBITO',
      'TRANSFERENCIA',
      'COMBINADO'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  "clienteId" UUID NOT NULL REFERENCES clientes(id),
  estado comercial_estado_cotizacion_enum NOT NULL DEFAULT 'BORRADOR',
  "fechaVigencia" DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notasCliente" TEXT,
  "terminosCondiciones" TEXT,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "convertidaAPedidoId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cotizacion_detalles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cotizacionId" UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  "varianteId" UUID NOT NULL REFERENCES variantes(id),
  "productoId" UUID NOT NULL REFERENCES productos(id),
  descripcion VARCHAR(200) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  "cotizacionId" UUID REFERENCES cotizaciones(id),
  "clienteId" UUID NOT NULL REFERENCES clientes(id),
  estado comercial_estado_pedido_enum NOT NULL DEFAULT 'PENDIENTE',
  "direccionEntrega" TEXT,
  "fechaEntregaEsperada" DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "pedidoId" UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  "varianteId" UUID NOT NULL REFERENCES variantes(id),
  descripcion VARCHAR(200) NOT NULL,
  cantidad INTEGER NOT NULL,
  "precioUnitario" DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  "pedidoId" UUID REFERENCES pedidos(id),
  "clienteId" UUID NOT NULL REFERENCES clientes(id),
  estado comercial_estado_factura_enum NOT NULL DEFAULT 'BORRADOR',
  "fechaEmision" DATE NOT NULL,
  "fechaVencimiento" DATE NOT NULL,
  "fechaPago" DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  retencion DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo DECIMAL(12,2) NOT NULL DEFAULT 0,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos_factura (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "facturaId" UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  "metodoPago" comercial_metodo_pago_enum NOT NULL,
  referencia VARCHAR(100),
  notas TEXT,
  "registradoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones("clienteId");
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_cotizacion ON cotizacion_detalles("cotizacionId");
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_variante ON cotizacion_detalles("varianteId");

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos("clienteId");
CREATE INDEX IF NOT EXISTS idx_pedidos_cotizacion ON pedidos("cotizacionId");
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_pedido ON detalle_pedidos("pedidoId");
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_variante ON detalle_pedidos("varianteId");

CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas("clienteId");
CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON facturas("pedidoId");
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_saldo ON facturas(saldo);
CREATE INDEX IF NOT EXISTS idx_facturas_vencimiento ON facturas("fechaVencimiento");

CREATE INDEX IF NOT EXISTS idx_pagos_factura_factura ON pagos_factura("facturaId");
CREATE INDEX IF NOT EXISTS idx_pagos_factura_fecha ON pagos_factura(fecha);

COMMIT;
