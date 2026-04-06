-- ============================================================================
-- Migracion: Esquema RRHH Nomina (nominas colectivas y liquidaciones)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_nominas_colectivas_estado_enum') THEN
    CREATE TYPE rrhh_nominas_colectivas_estado_enum AS ENUM (
      'EN_PROCESO',
      'APROBADA',
      'PAGADA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_liquidaciones_nomina_estado_enum') THEN
    CREATE TYPE rrhh_liquidaciones_nomina_estado_enum AS ENUM (
      'BORRADOR',
      'APROBADA',
      'PAGADA'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS rrhh_nominas_colectivas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  "sedeId" UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  estado rrhh_nominas_colectivas_estado_enum NOT NULL DEFAULT 'EN_PROCESO',
  "totalEmpleados" INTEGER NOT NULL,
  "totalDevengado" DECIMAL(14,2) NOT NULL,
  "totalDeducciones" DECIMAL(14,2) NOT NULL,
  "totalNeto" DECIMAL(14,2) NOT NULL,
  "aprobadaPorId" UUID,
  "pagadaEn" TIMESTAMP,
  CONSTRAINT chk_rrhh_nominas_mes CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT chk_rrhh_nominas_totales_non_negative CHECK (
    "totalEmpleados" >= 0 AND "totalDevengado" >= 0 AND "totalDeducciones" >= 0 AND "totalNeto" >= 0
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_rrhh_nominas_aprobada_por'
  ) THEN
    ALTER TABLE rrhh_nominas_colectivas
    ADD CONSTRAINT fk_rrhh_nominas_aprobada_por
    FOREIGN KEY ("aprobadaPorId")
    REFERENCES usuarios(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS rrhh_liquidaciones_nomina (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "empleadoId" UUID NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  "nominaColectivaId" UUID REFERENCES rrhh_nominas_colectivas(id) ON DELETE SET NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  "diasTrabajados" INTEGER NOT NULL,
  "diasAusencia" INTEGER NOT NULL DEFAULT 0,
  "salarioBase" DECIMAL(12,2) NOT NULL,
  "auxilioTransporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "horasExtra" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "valorHorasExtra" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalDevengado" DECIMAL(14,2) NOT NULL,
  "saludEmpleado" DECIMAL(12,2) NOT NULL,
  "pensionEmpleado" DECIMAL(12,2) NOT NULL,
  "retencionFuente" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "otrasDeduciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalDeducciones" DECIMAL(14,2) NOT NULL,
  "netoPagar" DECIMAL(14,2) NOT NULL,
  estado rrhh_liquidaciones_nomina_estado_enum NOT NULL DEFAULT 'BORRADOR',
  CONSTRAINT uq_rrhh_liquidacion_empleado_mes_ano UNIQUE ("empleadoId", mes, ano),
  CONSTRAINT chk_rrhh_liquidaciones_mes CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT chk_rrhh_liquidaciones_dias_non_negative CHECK ("diasTrabajados" >= 0 AND "diasAusencia" >= 0),
  CONSTRAINT chk_rrhh_liquidaciones_montos_non_negative CHECK (
    "salarioBase" >= 0 AND "auxilioTransporte" >= 0 AND "horasExtra" >= 0 AND "valorHorasExtra" >= 0
    AND "totalDevengado" >= 0 AND "saludEmpleado" >= 0 AND "pensionEmpleado" >= 0
    AND "retencionFuente" >= 0 AND "otrasDeduciones" >= 0 AND "totalDeducciones" >= 0 AND "netoPagar" >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_rrhh_nominas_sede ON rrhh_nominas_colectivas("sedeId");
CREATE INDEX IF NOT EXISTS idx_rrhh_nominas_periodo ON rrhh_nominas_colectivas(ano, mes);
CREATE INDEX IF NOT EXISTS idx_rrhh_nominas_estado ON rrhh_nominas_colectivas(estado);
CREATE INDEX IF NOT EXISTS idx_rrhh_nominas_aprobada_por ON rrhh_nominas_colectivas("aprobadaPorId");

CREATE INDEX IF NOT EXISTS idx_rrhh_liquidaciones_empleado ON rrhh_liquidaciones_nomina("empleadoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_liquidaciones_nomina ON rrhh_liquidaciones_nomina("nominaColectivaId");
CREATE INDEX IF NOT EXISTS idx_rrhh_liquidaciones_periodo ON rrhh_liquidaciones_nomina(ano, mes);
CREATE INDEX IF NOT EXISTS idx_rrhh_liquidaciones_estado ON rrhh_liquidaciones_nomina(estado);

COMMIT;
