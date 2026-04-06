-- ============================================================================
-- Migracion: Superadmin + Integraciones + Verticales
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- ENUMS
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'empresas_plan_enum') THEN
    CREATE TYPE empresas_plan_enum AS ENUM ('STARTER','PROFESSIONAL','ENTERPRISE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'empresas_estado_enum') THEN
    CREATE TYPE empresas_estado_enum AS ENUM ('ACTIVA','SUSPENDIDA','TRIAL','CANCELADA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logs_actividad_resultado_enum') THEN
    CREATE TYPE logs_actividad_resultado_enum AS ENUM ('EXITO','ERROR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integraciones_config_tipo_enum') THEN
    CREATE TYPE integraciones_config_tipo_enum AS ENUM (
      'SIIGO','DIAN_FE','WHATSAPP_BUSINESS','SMTP','S3','WOMPI','CUSTOM_WEBHOOK'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integraciones_config_estado_enum') THEN
    CREATE TYPE integraciones_config_estado_enum AS ENUM ('OK','ERROR','SIN_CONFIGURAR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logs_integracion_tipo_enum') THEN
    CREATE TYPE logs_integracion_tipo_enum AS ENUM ('REQUEST','WEBHOOK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logs_integracion_estado_enum') THEN
    CREATE TYPE logs_integracion_estado_enum AS ENUM ('EXITO','ERROR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inmuebles_tipo_enum') THEN
    CREATE TYPE inmuebles_tipo_enum AS ENUM ('APARTAMENTO','CASA','LOCAL','OFICINA','BODEGA','LOTE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inmuebles_estado_enum') THEN
    CREATE TYPE inmuebles_estado_enum AS ENUM ('DISPONIBLE','ARRENDADO','VENDIDO','EN_OFERTA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inmuebles_negocio_enum') THEN
    CREATE TYPE inmuebles_negocio_enum AS ENUM ('VENTA','ARRIENDO','AMBOS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contratos_arrendamiento_estado_enum') THEN
    CREATE TYPE contratos_arrendamiento_estado_enum AS ENUM ('ACTIVO','VENCIDO','TERMINADO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pagos_arriendo_estado_enum') THEN
    CREATE TYPE pagos_arriendo_estado_enum AS ENUM ('PENDIENTE','PAGADO','VENCIDO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inversionistas_tipoinversionista_enum') THEN
    CREATE TYPE inversionistas_tipoinversionista_enum AS ENUM ('PERSONA_NATURAL','JURIDICA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inversionistas_perfilriesgo_enum') THEN
    CREATE TYPE inversionistas_perfilriesgo_enum AS ENUM ('CONSERVADOR','MODERADO','AGRESIVO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inversion_items_tipo_enum') THEN
    CREATE TYPE inversion_items_tipo_enum AS ENUM (
      'ACCION','BONO','FINCA_RAIZ','CDT','FONDO','CRYPTO','OTRO'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimientos_inversion_tipo_enum') THEN
    CREATE TYPE movimientos_inversion_tipo_enum AS ENUM (
      'COMPRA','VENTA','DIVIDENDO','AJUSTE','APORTE','RETIRO'
    );
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- SUPERADMIN
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(200) NOT NULL,
  telefono VARCHAR(30),
  plan empresas_plan_enum NOT NULL DEFAULT 'STARTER',
  estado empresas_estado_enum NOT NULL DEFAULT 'TRIAL',
  modulos TEXT[] NOT NULL DEFAULT '{}',
  "maxUsuarios" INTEGER NOT NULL DEFAULT 5,
  "maxSedes" INTEGER NOT NULL DEFAULT 1,
  "vencimientoEn" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs_actividad (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "empresaId" UUID,
  "usuarioId" UUID,
  "ipAddress" VARCHAR(50) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(100) NOT NULL,
  "entidadTipo" VARCHAR(50),
  "entidadId" UUID,
  resultado logs_actividad_resultado_enum NOT NULL DEFAULT 'EXITO',
  error TEXT,
  "duracionMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS "empresaId" UUID;

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios("empresaId");
CREATE INDEX IF NOT EXISTS idx_logs_actividad_empresa ON logs_actividad("empresaId");
CREATE INDEX IF NOT EXISTS idx_logs_actividad_created_at ON logs_actividad("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_usuarios_empresa'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT fk_usuarios_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_logs_actividad_empresa'
  ) THEN
    ALTER TABLE logs_actividad
      ADD CONSTRAINT fk_logs_actividad_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_logs_actividad_usuario'
  ) THEN
    ALTER TABLE logs_actividad
      ADD CONSTRAINT fk_logs_actividad_usuario
      FOREIGN KEY ("usuarioId") REFERENCES usuarios(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- INTEGRACIONES
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integraciones_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo integraciones_config_tipo_enum NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT FALSE,
  credenciales JSONB NOT NULL DEFAULT '{}'::jsonb,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ultimaSync" TIMESTAMPTZ,
  estado integraciones_config_estado_enum NOT NULL DEFAULT 'SIN_CONFIGURAR',
  "mensajeError" TEXT
);

CREATE TABLE IF NOT EXISTS logs_integracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "integracionId" UUID NOT NULL,
  tipo logs_integracion_tipo_enum NOT NULL,
  estado logs_integracion_estado_enum NOT NULL,
  request JSONB,
  response JSONB,
  error TEXT,
  "duracionMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_integracion_integracion_id ON logs_integracion("integracionId");
CREATE INDEX IF NOT EXISTS idx_logs_integracion_created_at ON logs_integracion("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_logs_integracion_integracion'
  ) THEN
    ALTER TABLE logs_integracion
      ADD CONSTRAINT fk_logs_integracion_integracion
      FOREIGN KEY ("integracionId") REFERENCES integraciones_config(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- VERTICALES: INMOBILIARIA
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inmuebles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  tipo inmuebles_tipo_enum NOT NULL,
  estado inmuebles_estado_enum NOT NULL DEFAULT 'DISPONIBLE',
  negocio inmuebles_negocio_enum NOT NULL,
  direccion TEXT NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  barrio VARCHAR(100),
  estrato INTEGER,
  "areaTotalM2" DECIMAL(8,2) NOT NULL,
  habitaciones INTEGER,
  banos INTEGER,
  parqueaderos INTEGER,
  "valorVenta" DECIMAL(14,2),
  "valorArriendo" DECIMAL(14,2),
  "valorAdministracion" DECIMAL(14,2),
  "propietarioId" UUID,
  fotos TEXT[] NOT NULL DEFAULT '{}',
  descripcion TEXT,
  latitud DECIMAL(9,6),
  longitud DECIMAL(9,6),
  "empresaId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inmuebles_estrato CHECK (estrato IS NULL OR estrato BETWEEN 1 AND 6)
);

CREATE TABLE IF NOT EXISTS contratos_arrendamiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "inmuebleId" UUID NOT NULL,
  "arrendatarioId" UUID NOT NULL,
  "propietarioId" UUID NOT NULL,
  "fechaInicio" DATE NOT NULL,
  "fechaFin" DATE NOT NULL,
  "duracionMeses" INTEGER NOT NULL,
  "canonMensual" DECIMAL(12,2) NOT NULL,
  deposito DECIMAL(12,2) NOT NULL,
  "incrementoPorcentaje" DECIMAL(5,2),
  estado contratos_arrendamiento_estado_enum NOT NULL DEFAULT 'ACTIVO',
  "empresaId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos_arriendo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "contratoId" UUID NOT NULL,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  "fechaVencimiento" DATE NOT NULL,
  "fechaPago" DATE,
  estado pagos_arriendo_estado_enum NOT NULL DEFAULT 'PENDIENTE',
  penalidad DECIMAL(12,2) NOT NULL DEFAULT 0,
  "empresaId" UUID,
  CONSTRAINT uq_pago_contrato_mes_anio UNIQUE ("contratoId", mes, anio),
  CONSTRAINT chk_pagos_arriendo_mes CHECK (mes BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS idx_inmuebles_empresa_id ON inmuebles("empresaId");
CREATE INDEX IF NOT EXISTS idx_contratos_arr_empresa_id ON contratos_arrendamiento("empresaId");
CREATE INDEX IF NOT EXISTS idx_pagos_arr_empresa_id ON pagos_arriendo("empresaId");
CREATE INDEX IF NOT EXISTS idx_pagos_arr_contrato_id ON pagos_arriendo("contratoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inmuebles_empresa'
  ) THEN
    ALTER TABLE inmuebles
      ADD CONSTRAINT fk_inmuebles_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inmuebles_propietario_cliente'
  ) THEN
    ALTER TABLE inmuebles
      ADD CONSTRAINT fk_inmuebles_propietario_cliente
      FOREIGN KEY ("propietarioId") REFERENCES clientes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contrato_inmueble'
  ) THEN
    ALTER TABLE contratos_arrendamiento
      ADD CONSTRAINT fk_contrato_inmueble
      FOREIGN KEY ("inmuebleId") REFERENCES inmuebles(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contrato_arrendatario_cliente'
  ) THEN
    ALTER TABLE contratos_arrendamiento
      ADD CONSTRAINT fk_contrato_arrendatario_cliente
      FOREIGN KEY ("arrendatarioId") REFERENCES clientes(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contrato_propietario_cliente'
  ) THEN
    ALTER TABLE contratos_arrendamiento
      ADD CONSTRAINT fk_contrato_propietario_cliente
      FOREIGN KEY ("propietarioId") REFERENCES clientes(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contrato_empresa'
  ) THEN
    ALTER TABLE contratos_arrendamiento
      ADD CONSTRAINT fk_contrato_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pago_contrato'
  ) THEN
    ALTER TABLE pagos_arriendo
      ADD CONSTRAINT fk_pago_contrato
      FOREIGN KEY ("contratoId") REFERENCES contratos_arrendamiento(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pago_empresa'
  ) THEN
    ALTER TABLE pagos_arriendo
      ADD CONSTRAINT fk_pago_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- VERTICALES: INVERSIONISTAS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inversionistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clienteId" UUID NOT NULL,
  "tipoInversionista" inversionistas_tipoinversionista_enum NOT NULL,
  "perfilRiesgo" inversionistas_perfilriesgo_enum NOT NULL,
  "montoMaximoInversion" DECIMAL(14,2),
  "documentosVerificados" BOOLEAN NOT NULL DEFAULT FALSE,
  "empresaId" UUID
);

CREATE TABLE IF NOT EXISTS portafolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "inversionistaId" UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "empresaId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inversion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "portafolioId" UUID NOT NULL,
  tipo inversion_items_tipo_enum NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  simbolo VARCHAR(20),
  moneda VARCHAR(3) NOT NULL DEFAULT 'COP',
  "cantidadUnidades" DECIMAL(14,6) NOT NULL,
  "precioCompra" DECIMAL(14,2) NOT NULL,
  "precioActual" DECIMAL(14,2) NOT NULL,
  "fechaCompra" DATE NOT NULL,
  "fechaVencimiento" DATE,
  dividendos DECIMAL(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  "empresaId" UUID,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_inversion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "itemId" UUID NOT NULL,
  tipo movimientos_inversion_tipo_enum NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  "cantidadUnidades" DECIMAL(14,6),
  fecha DATE NOT NULL,
  nota TEXT,
  "registradoPorId" UUID NOT NULL,
  "empresaId" UUID
);

CREATE INDEX IF NOT EXISTS idx_inversionistas_empresa_id ON inversionistas("empresaId");
CREATE INDEX IF NOT EXISTS idx_portafolios_inversionista_id ON portafolios("inversionistaId");
CREATE INDEX IF NOT EXISTS idx_portafolios_empresa_id ON portafolios("empresaId");
CREATE INDEX IF NOT EXISTS idx_inversion_items_portafolio_id ON inversion_items("portafolioId");
CREATE INDEX IF NOT EXISTS idx_inversion_items_empresa_id ON inversion_items("empresaId");
CREATE INDEX IF NOT EXISTS idx_movimientos_inversion_item_id ON movimientos_inversion("itemId");
CREATE INDEX IF NOT EXISTS idx_movimientos_inversion_empresa_id ON movimientos_inversion("empresaId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inversionista_cliente'
  ) THEN
    ALTER TABLE inversionistas
      ADD CONSTRAINT fk_inversionista_cliente
      FOREIGN KEY ("clienteId") REFERENCES clientes(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inversionista_empresa'
  ) THEN
    ALTER TABLE inversionistas
      ADD CONSTRAINT fk_inversionista_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_portafolio_inversionista'
  ) THEN
    ALTER TABLE portafolios
      ADD CONSTRAINT fk_portafolio_inversionista
      FOREIGN KEY ("inversionistaId") REFERENCES inversionistas(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_portafolio_empresa'
  ) THEN
    ALTER TABLE portafolios
      ADD CONSTRAINT fk_portafolio_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inversion_item_portafolio'
  ) THEN
    ALTER TABLE inversion_items
      ADD CONSTRAINT fk_inversion_item_portafolio
      FOREIGN KEY ("portafolioId") REFERENCES portafolios(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_inversion_item_empresa'
  ) THEN
    ALTER TABLE inversion_items
      ADD CONSTRAINT fk_inversion_item_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_item'
  ) THEN
    ALTER TABLE movimientos_inversion
      ADD CONSTRAINT fk_movimiento_item
      FOREIGN KEY ("itemId") REFERENCES inversion_items(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_registrado_por'
  ) THEN
    ALTER TABLE movimientos_inversion
      ADD CONSTRAINT fk_movimiento_registrado_por
      FOREIGN KEY ("registradoPorId") REFERENCES usuarios(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_empresa'
  ) THEN
    ALTER TABLE movimientos_inversion
      ADD CONSTRAINT fk_movimiento_empresa
      FOREIGN KEY ("empresaId") REFERENCES empresas(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
