-- ============================================================================
-- Migracion: Esquema RRHH (areas, cargos, empleados, turnos, asistencia)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_cargos_nivel_enum') THEN
    CREATE TYPE rrhh_cargos_nivel_enum AS ENUM (
      'OPERATIVO',
      'TECNICO',
      'PROFESIONAL',
      'DIRECTIVO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_empleados_tipodocumento_enum') THEN
    CREATE TYPE rrhh_empleados_tipodocumento_enum AS ENUM (
      'CC',
      'CE',
      'PASAPORTE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_empleados_tipocontrato_enum') THEN
    CREATE TYPE rrhh_empleados_tipocontrato_enum AS ENUM (
      'INDEFINIDO',
      'FIJO',
      'OBRA_LABOR',
      'PRESTACION_SERVICIOS',
      'APRENDIZ'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_empleados_estado_enum') THEN
    CREATE TYPE rrhh_empleados_estado_enum AS ENUM (
      'ACTIVO',
      'RETIRADO',
      'SUSPENDIDO',
      'VACACIONES'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_asistencias_tipo_enum') THEN
    CREATE TYPE rrhh_asistencias_tipo_enum AS ENUM (
      'NORMAL',
      'HORA_EXTRA',
      'FESTIVO',
      'VACACIONES',
      'INCAPACIDAD',
      'PERMISO',
      'AUSENCIA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rrhh_vacaciones_estado_enum') THEN
    CREATE TYPE rrhh_vacaciones_estado_enum AS ENUM (
      'SOLICITADA',
      'APROBADA',
      'RECHAZADA',
      'EN_CURSO',
      'COMPLETADA'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS rrhh_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  "responsableId" UUID,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rrhh_cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  "areaId" UUID NOT NULL REFERENCES rrhh_areas(id) ON DELETE RESTRICT,
  "salarioBase" DECIMAL(12,2) NOT NULL,
  nivel rrhh_cargos_nivel_enum NOT NULL,
  CONSTRAINT chk_rrhh_cargos_salario_non_negative CHECK ("salarioBase" >= 0)
);

CREATE TABLE IF NOT EXISTS rrhh_empleados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "usuarioId" UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  "tipoDocumento" rrhh_empleados_tipodocumento_enum NOT NULL,
  "numeroDocumento" VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  telefono VARCHAR(30),
  "fechaNacimiento" DATE,
  genero VARCHAR(10),
  "cargoId" UUID NOT NULL REFERENCES rrhh_cargos(id) ON DELETE RESTRICT,
  "areaId" UUID NOT NULL REFERENCES rrhh_areas(id) ON DELETE RESTRICT,
  "sedeId" UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  "tipoContrato" rrhh_empleados_tipocontrato_enum NOT NULL,
  "fechaIngreso" DATE NOT NULL,
  "fechaRetiro" DATE,
  estado rrhh_empleados_estado_enum NOT NULL DEFAULT 'ACTIVO',
  "salarioBase" DECIMAL(12,2) NOT NULL,
  "auxilioTransporte" BOOLEAN NOT NULL DEFAULT TRUE,
  eps VARCHAR(100),
  arl VARCHAR(100),
  "fondoPension" VARCHAR(100),
  "cuentaBancaria" VARCHAR(30),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rrhh_empleados_salario_non_negative CHECK ("salarioBase" >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_rrhh_areas_responsable'
  ) THEN
    ALTER TABLE rrhh_areas
    ADD CONSTRAINT fk_rrhh_areas_responsable
    FOREIGN KEY ("responsableId")
    REFERENCES rrhh_empleados(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS rrhh_turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  "horaInicio" TIME NOT NULL,
  "horaFin" TIME NOT NULL,
  "diasSemana" INTEGER[] NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS rrhh_asignaciones_turno (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "empleadoId" UUID NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  "turnoId" UUID NOT NULL REFERENCES rrhh_turnos(id) ON DELETE RESTRICT,
  "fechaDesde" DATE NOT NULL,
  "fechaHasta" DATE,
  "sedeId" UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS rrhh_asistencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "empleadoId" UUID NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  "turnoId" UUID REFERENCES rrhh_turnos(id) ON DELETE SET NULL,
  "horaEntrada" TIMESTAMP,
  "horaSalida" TIMESTAMP,
  tipo rrhh_asistencias_tipo_enum NOT NULL DEFAULT 'NORMAL',
  observacion TEXT,
  CONSTRAINT uq_rrhh_asistencia_empleado_fecha UNIQUE ("empleadoId", fecha)
);

CREATE TABLE IF NOT EXISTS rrhh_vacaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "empleadoId" UUID NOT NULL REFERENCES rrhh_empleados(id) ON DELETE CASCADE,
  "fechaInicio" DATE NOT NULL,
  "fechaFin" DATE NOT NULL,
  "diasHabiles" INTEGER NOT NULL,
  estado rrhh_vacaciones_estado_enum NOT NULL DEFAULT 'SOLICITADA',
  "aprobadaPorId" UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  "motivoRechazo" TEXT,
  CONSTRAINT chk_rrhh_vacaciones_dias_non_negative CHECK ("diasHabiles" >= 0)
);

CREATE INDEX IF NOT EXISTS idx_rrhh_areas_nombre ON rrhh_areas(nombre);
CREATE INDEX IF NOT EXISTS idx_rrhh_areas_activa ON rrhh_areas(activa);
CREATE INDEX IF NOT EXISTS idx_rrhh_areas_responsable ON rrhh_areas("responsableId");

CREATE INDEX IF NOT EXISTS idx_rrhh_cargos_area ON rrhh_cargos("areaId");
CREATE INDEX IF NOT EXISTS idx_rrhh_cargos_nivel ON rrhh_cargos(nivel);

CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_usuario ON rrhh_empleados("usuarioId");
CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_cargo ON rrhh_empleados("cargoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_area ON rrhh_empleados("areaId");
CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_sede ON rrhh_empleados("sedeId");
CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_estado ON rrhh_empleados(estado);
CREATE INDEX IF NOT EXISTS idx_rrhh_empleados_nombre ON rrhh_empleados(nombre);

CREATE INDEX IF NOT EXISTS idx_rrhh_asignaciones_empleado ON rrhh_asignaciones_turno("empleadoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_asignaciones_turno ON rrhh_asignaciones_turno("turnoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_asignaciones_sede ON rrhh_asignaciones_turno("sedeId");

CREATE INDEX IF NOT EXISTS idx_rrhh_asistencias_empleado ON rrhh_asistencias("empleadoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_asistencias_turno ON rrhh_asistencias("turnoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_asistencias_fecha ON rrhh_asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_rrhh_asistencias_tipo ON rrhh_asistencias(tipo);

CREATE INDEX IF NOT EXISTS idx_rrhh_vacaciones_empleado ON rrhh_vacaciones("empleadoId");
CREATE INDEX IF NOT EXISTS idx_rrhh_vacaciones_estado ON rrhh_vacaciones(estado);
CREATE INDEX IF NOT EXISTS idx_rrhh_vacaciones_fechas ON rrhh_vacaciones("fechaInicio", "fechaFin");

COMMIT;
