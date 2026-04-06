-- ============================================================================
-- Migracion: Esquema CRM (leads, oportunidades, actividades)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_origen_lead_enum') THEN
    CREATE TYPE crm_origen_lead_enum AS ENUM (
      'REFERIDO',
      'WEB',
      'REDES_SOCIALES',
      'LLAMADA',
      'VISITA',
      'WHATSAPP',
      'OTRO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_estado_lead_enum') THEN
    CREATE TYPE crm_estado_lead_enum AS ENUM (
      'NUEVO',
      'CONTACTADO',
      'CALIFICADO',
      'OPORTUNIDAD',
      'GANADO',
      'PERDIDO',
      'DESCARTADO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_etapa_oportunidad_enum') THEN
    CREATE TYPE crm_etapa_oportunidad_enum AS ENUM (
      'PROSPECTO',
      'PROPUESTA',
      'NEGOCIACION',
      'CIERRE',
      'GANADA',
      'PERDIDA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_tipo_actividad_enum') THEN
    CREATE TYPE crm_tipo_actividad_enum AS ENUM (
      'LLAMADA',
      'REUNION',
      'EMAIL',
      'WHATSAPP',
      'TAREA',
      'NOTA',
      'VISITA'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  empresa VARCHAR(150),
  email VARCHAR(200),
  telefono VARCHAR(30),
  origen crm_origen_lead_enum NOT NULL,
  estado crm_estado_lead_enum NOT NULL DEFAULT 'NUEVO',
  "valorEstimado" DECIMAL(14,2),
  probabilidad INTEGER,
  "asignadoAId" UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  "sedeId" UUID NOT NULL REFERENCES sedes(id),
  notas TEXT,
  "motivoPerdida" TEXT,
  "fechaProximoContacto" DATE,
  "ultimoContacto" TIMESTAMP,
  "convertidoAClienteId" UUID REFERENCES clientes(id) ON DELETE SET NULL,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_crm_leads_probabilidad_rango CHECK (probabilidad IS NULL OR (probabilidad BETWEEN 0 AND 100))
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(200) NOT NULL,
  "leadId" UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  "clienteId" UUID REFERENCES clientes(id) ON DELETE SET NULL,
  etapa crm_etapa_oportunidad_enum NOT NULL DEFAULT 'PROSPECTO',
  valor DECIMAL(14,2) NOT NULL,
  probabilidad INTEGER NOT NULL,
  "fechaCierreEsperada" DATE NOT NULL,
  "fechaCierreReal" DATE,
  "asignadoAId" UUID NOT NULL REFERENCES usuarios(id),
  descripcion TEXT,
  "motivoPerdida" TEXT,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_crm_oportunidades_probabilidad_rango CHECK (probabilidad BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS crm_actividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo crm_tipo_actividad_enum NOT NULL,
  "leadId" UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  "oportunidadId" UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL,
  "clienteId" UUID REFERENCES clientes(id) ON DELETE SET NULL,
  asunto VARCHAR(200) NOT NULL,
  descripcion TEXT,
  resultado TEXT,
  "duracionMinutos" INTEGER,
  "realizadoPorId" UUID NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMP NOT NULL,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  "proximaAccion" TEXT,
  "fechaProximaAccion" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_crm_actividades_duracion_non_negative CHECK ("duracionMinutos" IS NULL OR "duracionMinutos" >= 0),
  CONSTRAINT chk_crm_actividades_relacion CHECK (
    "leadId" IS NOT NULL OR "oportunidadId" IS NOT NULL OR "clienteId" IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_estado ON crm_leads(estado);
CREATE INDEX IF NOT EXISTS idx_crm_leads_origen ON crm_leads(origen);
CREATE INDEX IF NOT EXISTS idx_crm_leads_asignado ON crm_leads("asignadoAId");
CREATE INDEX IF NOT EXISTS idx_crm_leads_sede ON crm_leads("sedeId");

CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_etapa ON crm_oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_asignado ON crm_oportunidades("asignadoAId");
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_lead ON crm_oportunidades("leadId");
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_cliente ON crm_oportunidades("clienteId");

CREATE INDEX IF NOT EXISTS idx_crm_actividades_fecha ON crm_actividades(fecha);
CREATE INDEX IF NOT EXISTS idx_crm_actividades_completada ON crm_actividades(completada);
CREATE INDEX IF NOT EXISTS idx_crm_actividades_fecha_proxima ON crm_actividades("fechaProximaAccion");
CREATE INDEX IF NOT EXISTS idx_crm_actividades_lead ON crm_actividades("leadId");
CREATE INDEX IF NOT EXISTS idx_crm_actividades_oportunidad ON crm_actividades("oportunidadId");
CREATE INDEX IF NOT EXISTS idx_crm_actividades_cliente ON crm_actividades("clienteId");

COMMIT;
