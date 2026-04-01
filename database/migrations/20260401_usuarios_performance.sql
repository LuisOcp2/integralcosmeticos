-- ============================================================================
-- Migracion: Indices de performance para modulo de usuarios
-- Fecha: 2026-04-01
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo
  ON usuarios (rol, activo);

CREATE INDEX IF NOT EXISTS idx_usuarios_sede_activo
  ON usuarios ("sedeId", activo);

CREATE INDEX IF NOT EXISTS idx_usuarios_created_at_desc
  ON usuarios ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo_created_at
  ON usuarios (rol, activo, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_sede_activo_created_at
  ON usuarios ("sedeId", activo, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower
  ON usuarios (lower(email));

CREATE INDEX IF NOT EXISTS idx_usuarios_email_trgm
  ON usuarios USING gin (lower(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_trgm
  ON usuarios USING gin (translate(lower(nombre), 'áéíóúüñ', 'aeiouun') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_apellido_trgm
  ON usuarios USING gin (translate(lower(apellido), 'áéíóúüñ', 'aeiouun') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_fullname_trgm
  ON usuarios USING gin (
    (
      translate(lower(coalesce(nombre, '') || ' ' || coalesce(apellido, '')), 'áéíóúüñ', 'aeiouun')
    ) gin_trgm_ops
  );

COMMIT;
