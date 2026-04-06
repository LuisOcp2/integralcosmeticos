-- ============================================================================
-- Migracion: Notificaciones + Omnicanal + Workflows
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificacion_tipo_enum') THEN
    CREATE TYPE notificacion_tipo_enum AS ENUM (
      'INFO',
      'ALERTA',
      'ERROR',
      'EXITO',
      'RECORDATORIO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificacion_categoria_enum') THEN
    CREATE TYPE notificacion_categoria_enum AS ENUM (
      'STOCK',
      'VENTA',
      'CRM',
      'RRHH',
      'FINANZAS',
      'DOCUMENTO',
      'SISTEMA',
      'TAREA',
      'GENERAL'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificacion_prioridad_enum') THEN
    CREATE TYPE notificacion_prioridad_enum AS ENUM (
      'BAJA',
      'MEDIA',
      'ALTA',
      'URGENTE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_canal_enum') THEN
    CREATE TYPE omnicanal_canal_enum AS ENUM (
      'WHATSAPP',
      'EMAIL',
      'WEB_CHAT'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_estado_conversacion_enum') THEN
    CREATE TYPE omnicanal_estado_conversacion_enum AS ENUM (
      'NUEVA',
      'ASIGNADA',
      'EN_ATENCION',
      'RESUELTA',
      'CERRADA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_prioridad_conversacion_enum') THEN
    CREATE TYPE omnicanal_prioridad_conversacion_enum AS ENUM (
      'BAJA',
      'MEDIA',
      'ALTA',
      'URGENTE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_tipo_mensaje_enum') THEN
    CREATE TYPE omnicanal_tipo_mensaje_enum AS ENUM (
      'TEXTO',
      'IMAGEN',
      'AUDIO',
      'DOCUMENTO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_direccion_mensaje_enum') THEN
    CREATE TYPE omnicanal_direccion_mensaje_enum AS ENUM (
      'ENTRANTE',
      'SALIENTE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_estado_mensaje_enum') THEN
    CREATE TYPE omnicanal_estado_mensaje_enum AS ENUM (
      'ENVIADO',
      'ENTREGADO',
      'LEIDO',
      'FALLIDO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'omnicanal_categoria_plantilla_enum') THEN
    CREATE TYPE omnicanal_categoria_plantilla_enum AS ENUM (
      'BIENVENIDA',
      'COTIZACION',
      'SEGUIMIENTO',
      'SOPORTE',
      'PROMO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_estado_ejecucion_enum') THEN
    CREATE TYPE workflow_estado_ejecucion_enum AS ENUM (
      'EN_PROCESO',
      'EXITOSA',
      'FALLIDA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notificaciones'
  ) THEN
    CREATE TABLE notificaciones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "usuarioId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo notificacion_tipo_enum NOT NULL,
      categoria notificacion_categoria_enum NOT NULL,
      titulo VARCHAR(200) NOT NULL,
      mensaje TEXT NOT NULL,
      leida BOOLEAN NOT NULL DEFAULT FALSE,
      "leidaEn" TIMESTAMP,
      "accionLabel" VARCHAR(100),
      "accionRuta" VARCHAR(200),
      prioridad notificacion_prioridad_enum NOT NULL DEFAULT 'MEDIA',
      "expiresAt" TIMESTAMP,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    ALTER TABLE notificaciones
      ADD COLUMN IF NOT EXISTS categoria notificacion_categoria_enum DEFAULT 'GENERAL',
      ADD COLUMN IF NOT EXISTS "leidaEn" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "accionLabel" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "accionRuta" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS prioridad notificacion_prioridad_enum DEFAULT 'MEDIA',
      ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notificaciones' AND column_name = 'tipo'
    ) THEN
      BEGIN
        ALTER TABLE notificaciones
          ALTER COLUMN tipo TYPE notificacion_tipo_enum USING (
            CASE tipo::text
              WHEN 'SISTEMA' THEN 'INFO'
              WHEN 'STOCK_BAJO' THEN 'ALERTA'
              WHEN 'TRASPASO_PENDIENTE' THEN 'RECORDATORIO'
              WHEN 'VENTA_ANULADA' THEN 'ERROR'
              WHEN 'CIERRE_CAJA' THEN 'EXITO'
              WHEN 'DEVOLUCION' THEN 'INFO'
              WHEN 'INFO' THEN 'INFO'
              WHEN 'ALERTA' THEN 'ALERTA'
              WHEN 'ERROR' THEN 'ERROR'
              WHEN 'EXITO' THEN 'EXITO'
              WHEN 'RECORDATORIO' THEN 'RECORDATORIO'
              ELSE 'INFO'
            END
          )::notificacion_tipo_enum;
      EXCEPTION
        WHEN others THEN
          -- Si ya esta en tipo esperado o no se puede castear por datos legacy, se conserva y sigue.
          NULL;
      END;
    END IF;

    UPDATE notificaciones
    SET categoria = 'GENERAL'
    WHERE categoria IS NULL;

    UPDATE notificaciones
    SET prioridad = 'MEDIA'
    WHERE prioridad IS NULL;

    ALTER TABLE notificaciones
      ALTER COLUMN leida SET DEFAULT FALSE,
      ALTER COLUMN categoria SET NOT NULL,
      ALTER COLUMN prioridad SET NOT NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS configuraciones_notificacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "usuarioId" UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  "inApp" BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT FALSE,
  "silenciadoHasta" TIMESTAMP,
  "categoriasDesactivadas" TEXT[] NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omnicanal_conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal omnicanal_canal_enum NOT NULL,
  estado omnicanal_estado_conversacion_enum NOT NULL DEFAULT 'NUEVA',
  "clienteId" UUID REFERENCES clientes(id) ON DELETE SET NULL,
  "contactoNombre" VARCHAR(150) NOT NULL,
  "contactoIdentificador" VARCHAR(200) NOT NULL,
  "asignadoAId" UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  prioridad omnicanal_prioridad_conversacion_enum NOT NULL DEFAULT 'MEDIA',
  etiquetas TEXT[] NOT NULL DEFAULT '{}',
  "primerMensajeEn" TIMESTAMP NOT NULL,
  "ultimoMensajeEn" TIMESTAMP NOT NULL,
  "resueltaEn" TIMESTAMP,
  "canalExternoId" VARCHAR(200),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omnicanal_mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversacionId" UUID NOT NULL REFERENCES omnicanal_conversaciones(id) ON DELETE CASCADE,
  tipo omnicanal_tipo_mensaje_enum NOT NULL,
  direccion omnicanal_direccion_mensaje_enum NOT NULL,
  contenido TEXT,
  "archivoUrl" VARCHAR(500),
  estado omnicanal_estado_mensaje_enum NOT NULL DEFAULT 'ENVIADO',
  "enviadoPorId" UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS omnicanal_plantillas_mensaje (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  canal omnicanal_canal_enum NOT NULL,
  categoria omnicanal_categoria_plantilla_enum NOT NULL,
  asunto VARCHAR(200),
  cuerpo TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "trigger" JSONB NOT NULL,
  pasos JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[],
  estadisticas JSONB NOT NULL DEFAULT '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ejecuciones_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workflowId" UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  estado workflow_estado_ejecucion_enum NOT NULL,
  contexto JSONB NOT NULL,
  resultado JSONB,
  error TEXT,
  "duracionMs" INTEGER,
  "inicioEn" TIMESTAMP NOT NULL,
  "finEn" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON notificaciones("usuarioId", leida);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notificaciones' AND column_name = 'expiresAt'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notificaciones_expires_at ON notificaciones("expiresAt");
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_config_notif_usuario_unico ON configuraciones_notificacion("usuarioId");

CREATE INDEX IF NOT EXISTS idx_omnicanal_conv_ultimo_mensaje ON omnicanal_conversaciones("ultimoMensajeEn");
CREATE INDEX IF NOT EXISTS idx_omnicanal_conv_contacto ON omnicanal_conversaciones("contactoIdentificador");
CREATE INDEX IF NOT EXISTS idx_omnicanal_mensajes_conversacion ON omnicanal_mensajes("conversacionId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_omnicanal_plantillas_canal ON omnicanal_plantillas_mensaje(canal, activa);

CREATE INDEX IF NOT EXISTS idx_workflows_activo ON workflows(activo);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_tipo ON workflows(("trigger"->>'tipo'));
CREATE INDEX IF NOT EXISTS idx_ejecuciones_workflow_id ON ejecuciones_workflow("workflowId", "inicioEn");
CREATE INDEX IF NOT EXISTS idx_ejecuciones_workflow_estado ON ejecuciones_workflow(estado);

COMMIT;
