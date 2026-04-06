-- ============================================================================
-- Migracion: Esquema Activos, Proyectos y Documentos
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- ENUMS ACTIVOS
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activos_categorias_metododep_enum') THEN
    CREATE TYPE activos_categorias_metododep_enum AS ENUM (
      'LINEA_RECTA',
      'REDUCCION_SALDOS'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activos_estado_enum') THEN
    CREATE TYPE activos_estado_enum AS ENUM (
      'ACTIVO',
      'EN_MANTENIMIENTO',
      'DADO_DE_BAJA',
      'ROBADO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activos_movimientos_tipo_enum') THEN
    CREATE TYPE activos_movimientos_tipo_enum AS ENUM (
      'ALTA',
      'BAJA',
      'TRASLADO',
      'MANTENIMIENTO'
    );
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- ENUMS PROYECTOS
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_tipo_enum') THEN
    CREATE TYPE proyectos_tipo_enum AS ENUM (
      'INTERNO',
      'CLIENTE',
      'INFRAESTRUCTURA',
      'MARKETING',
      'TI'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_estado_enum') THEN
    CREATE TYPE proyectos_estado_enum AS ENUM (
      'PLANIFICACION',
      'EN_EJECUCION',
      'PAUSADO',
      'COMPLETADO',
      'CANCELADO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_prioridad_enum') THEN
    CREATE TYPE proyectos_prioridad_enum AS ENUM (
      'BAJA',
      'MEDIA',
      'ALTA',
      'CRITICA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_tareas_estado_enum') THEN
    CREATE TYPE proyectos_tareas_estado_enum AS ENUM (
      'PENDIENTE',
      'EN_PROGRESO',
      'REVISION',
      'COMPLETADA',
      'CANCELADA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_tareas_prioridad_enum') THEN
    CREATE TYPE proyectos_tareas_prioridad_enum AS ENUM (
      'BAJA',
      'MEDIA',
      'ALTA',
      'CRITICA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proyectos_miembros_rol_enum') THEN
    CREATE TYPE proyectos_miembros_rol_enum AS ENUM (
      'LIDER',
      'MIEMBRO',
      'OBSERVADOR'
    );
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- ENUMS DOCUMENTOS
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documentos_carpetas_acceso_enum') THEN
    CREATE TYPE documentos_carpetas_acceso_enum AS ENUM (
      'PUBLICO',
      'PRIVADO',
      'DEPARTAMENTO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documentos_tipo_enum') THEN
    CREATE TYPE documentos_tipo_enum AS ENUM (
      'CONTRATO',
      'FACTURA',
      'MANUAL',
      'POLITICA',
      'CERTIFICADO',
      'REPORTE',
      'OTRO'
    );
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- TABLAS ACTIVOS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activos_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  "vidaUtilAnios" INTEGER NOT NULL,
  "metodoDep" activos_categorias_metododep_enum NOT NULL DEFAULT 'LINEA_RECTA',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  "categoriaId" UUID NOT NULL REFERENCES activos_categorias(id) ON DELETE RESTRICT,
  "sedeId" UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  "custodioId" UUID,
  estado activos_estado_enum NOT NULL DEFAULT 'ACTIVO',
  marca VARCHAR(100),
  modelo VARCHAR(100),
  serial VARCHAR(100),
  "fechaCompra" DATE NOT NULL,
  "valorCompra" DECIMAL(14,2) NOT NULL,
  "valorResidual" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "valorActual" DECIMAL(14,2) NOT NULL,
  "proximoMantenimiento" DATE,
  "garantiaHasta" DATE,
  foto VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_activos_valores_non_negative CHECK (
    "valorCompra" >= 0 AND "valorResidual" >= 0 AND "valorActual" >= 0
  ),
  CONSTRAINT chk_activos_valor_residual_compra CHECK ("valorResidual" <= "valorCompra")
);

CREATE TABLE IF NOT EXISTS activos_movimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "activoId" UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  tipo activos_movimientos_tipo_enum NOT NULL,
  descripcion TEXT NOT NULL,
  "sedeOrigenId" UUID REFERENCES sedes(id) ON DELETE SET NULL,
  "sedeDestinoId" UUID REFERENCES sedes(id) ON DELETE SET NULL,
  costo DECIMAL(12,2),
  fecha TIMESTAMP NOT NULL,
  "realizadoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_activos_movimientos_costo_non_negative CHECK (costo IS NULL OR costo >= 0)
);

CREATE TABLE IF NOT EXISTS activos_depreciaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "activoId" UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  "montoDepreciacion" DECIMAL(12,2) NOT NULL,
  "valorLibros" DECIMAL(12,2) NOT NULL,
  CONSTRAINT uq_activos_depreciacion_periodo UNIQUE ("activoId", anio, mes),
  CONSTRAINT chk_activos_depreciaciones_mes CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT chk_activos_depreciaciones_valores_non_negative CHECK (
    "montoDepreciacion" >= 0 AND "valorLibros" >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos("categoriaId");
CREATE INDEX IF NOT EXISTS idx_activos_sede ON activos("sedeId");
CREATE INDEX IF NOT EXISTS idx_activos_custodio ON activos("custodioId");
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
CREATE INDEX IF NOT EXISTS idx_activos_proximo_mantenimiento ON activos("proximoMantenimiento");

CREATE INDEX IF NOT EXISTS idx_activos_movimientos_activo ON activos_movimientos("activoId");
CREATE INDEX IF NOT EXISTS idx_activos_movimientos_tipo ON activos_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_activos_movimientos_fecha ON activos_movimientos(fecha);

CREATE INDEX IF NOT EXISTS idx_activos_depreciaciones_activo ON activos_depreciaciones("activoId");
CREATE INDEX IF NOT EXISTS idx_activos_depreciaciones_anio_mes ON activos_depreciaciones(anio, mes);

DO $$
BEGIN
  IF to_regclass('public.rrhh_empleados') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_activos_custodio_rrhh_empleados'
    ) THEN
      ALTER TABLE activos
      ADD CONSTRAINT fk_activos_custodio_rrhh_empleados
      FOREIGN KEY ("custodioId")
      REFERENCES rrhh_empleados(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- TABLAS PROYECTOS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  tipo proyectos_tipo_enum NOT NULL,
  estado proyectos_estado_enum NOT NULL DEFAULT 'PLANIFICACION',
  "responsableId" UUID NOT NULL,
  "clienteId" UUID REFERENCES clientes(id) ON DELETE SET NULL,
  "fechaInicio" DATE NOT NULL,
  "fechaFinEsperada" DATE NOT NULL,
  "fechaFinReal" DATE,
  presupuesto DECIMAL(14,2),
  "costoActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
  prioridad proyectos_prioridad_enum NOT NULL DEFAULT 'MEDIA',
  "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_proyectos_porcentaje_avance CHECK ("porcentajeAvance" BETWEEN 0 AND 100),
  CONSTRAINT chk_proyectos_montos_non_negative CHECK (
    (presupuesto IS NULL OR presupuesto >= 0) AND "costoActual" >= 0
  )
);

CREATE TABLE IF NOT EXISTS proyectos_tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "proyectoId" UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  "parentId" UUID REFERENCES proyectos_tareas(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  estado proyectos_tareas_estado_enum NOT NULL DEFAULT 'PENDIENTE',
  prioridad proyectos_tareas_prioridad_enum NOT NULL DEFAULT 'MEDIA',
  "asignadoAId" UUID NOT NULL,
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "fechaVencimiento" DATE,
  "estimacionHoras" DECIMAL(5,2),
  "horasReales" DECIMAL(5,2) NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  "completadaEn" TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_proyectos_tareas_horas_non_negative CHECK (
    ("estimacionHoras" IS NULL OR "estimacionHoras" >= 0) AND "horasReales" >= 0
  ),
  CONSTRAINT chk_proyectos_tareas_orden_non_negative CHECK (orden >= 0)
);

CREATE TABLE IF NOT EXISTS proyectos_comentarios_tarea (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tareaId" UUID NOT NULL REFERENCES proyectos_tareas(id) ON DELETE CASCADE,
  "autorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  texto TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proyectos_miembros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "proyectoId" UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  "empleadoId" UUID NOT NULL,
  rol proyectos_miembros_rol_enum NOT NULL,
  CONSTRAINT uq_proyectos_miembro UNIQUE ("proyectoId", "empleadoId")
);

CREATE INDEX IF NOT EXISTS idx_proyectos_tipo ON proyectos(tipo);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado);
CREATE INDEX IF NOT EXISTS idx_proyectos_responsable ON proyectos("responsableId");
CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON proyectos("clienteId");
CREATE INDEX IF NOT EXISTS idx_proyectos_prioridad ON proyectos(prioridad);

CREATE INDEX IF NOT EXISTS idx_proyectos_tareas_proyecto ON proyectos_tareas("proyectoId");
CREATE INDEX IF NOT EXISTS idx_proyectos_tareas_parent ON proyectos_tareas("parentId");
CREATE INDEX IF NOT EXISTS idx_proyectos_tareas_estado ON proyectos_tareas(estado);
CREATE INDEX IF NOT EXISTS idx_proyectos_tareas_asignado ON proyectos_tareas("asignadoAId");
CREATE INDEX IF NOT EXISTS idx_proyectos_tareas_vencimiento ON proyectos_tareas("fechaVencimiento");

CREATE INDEX IF NOT EXISTS idx_proyectos_comentarios_tarea ON proyectos_comentarios_tarea("tareaId");
CREATE INDEX IF NOT EXISTS idx_proyectos_comentarios_autor ON proyectos_comentarios_tarea("autorId");

CREATE INDEX IF NOT EXISTS idx_proyectos_miembros_proyecto ON proyectos_miembros("proyectoId");
CREATE INDEX IF NOT EXISTS idx_proyectos_miembros_empleado ON proyectos_miembros("empleadoId");

DO $$
BEGIN
  IF to_regclass('public.rrhh_empleados') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_proyectos_responsable_rrhh_empleados'
    ) THEN
      ALTER TABLE proyectos
      ADD CONSTRAINT fk_proyectos_responsable_rrhh_empleados
      FOREIGN KEY ("responsableId")
      REFERENCES rrhh_empleados(id)
      ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_proyectos_tareas_asignado_rrhh_empleados'
    ) THEN
      ALTER TABLE proyectos_tareas
      ADD CONSTRAINT fk_proyectos_tareas_asignado_rrhh_empleados
      FOREIGN KEY ("asignadoAId")
      REFERENCES rrhh_empleados(id)
      ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_proyectos_miembros_empleado_rrhh_empleados'
    ) THEN
      ALTER TABLE proyectos_miembros
      ADD CONSTRAINT fk_proyectos_miembros_empleado_rrhh_empleados
      FOREIGN KEY ("empleadoId")
      REFERENCES rrhh_empleados(id)
      ON DELETE RESTRICT;
    END IF;
  END IF;
END
$$;

-- --------------------------------------------------------------------------
-- TABLAS DOCUMENTOS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documentos_carpetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  "padreId" UUID REFERENCES documentos_carpetas(id) ON DELETE SET NULL,
  acceso documentos_carpetas_acceso_enum NOT NULL DEFAULT 'PUBLICO',
  "creadaPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  "carpetaId" UUID NOT NULL REFERENCES documentos_carpetas(id) ON DELETE CASCADE,
  tipo documentos_tipo_enum NOT NULL,
  "nombreArchivo" VARCHAR(200) NOT NULL,
  "archivoUrl" VARCHAR(500) NOT NULL,
  tamano INTEGER NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  etiquetas TEXT[] NOT NULL DEFAULT '{}',
  "creadoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "vencimientoEn" DATE,
  "entidadTipo" VARCHAR(30),
  "entidadId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_documentos_tamano_non_negative CHECK (tamano >= 0),
  CONSTRAINT chk_documentos_version_positive CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS documentos_versiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "documentoId" UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  "archivoUrl" VARCHAR(500) NOT NULL,
  "nombreArchivo" VARCHAR(200) NOT NULL,
  cambios TEXT,
  "subidoPorId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_documentos_versiones_version_positive CHECK (version >= 1),
  CONSTRAINT uq_documentos_versiones_documento_version UNIQUE ("documentoId", version)
);

CREATE INDEX IF NOT EXISTS idx_documentos_carpetas_padre ON documentos_carpetas("padreId");
CREATE INDEX IF NOT EXISTS idx_documentos_carpetas_creada_por ON documentos_carpetas("creadaPorId");
CREATE INDEX IF NOT EXISTS idx_documentos_carpetas_acceso ON documentos_carpetas(acceso);

CREATE INDEX IF NOT EXISTS idx_documentos_carpeta ON documentos("carpetaId");
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_vencimiento ON documentos("vencimientoEn");
CREATE INDEX IF NOT EXISTS idx_documentos_entidad ON documentos("entidadTipo", "entidadId");
CREATE INDEX IF NOT EXISTS idx_documentos_creado_por ON documentos("creadoPorId");
CREATE INDEX IF NOT EXISTS idx_documentos_etiquetas_gin ON documentos USING GIN (etiquetas);

CREATE INDEX IF NOT EXISTS idx_documentos_versiones_documento ON documentos_versiones("documentoId");
CREATE INDEX IF NOT EXISTS idx_documentos_versiones_subido_por ON documentos_versiones("subidoPorId");

COMMIT;
