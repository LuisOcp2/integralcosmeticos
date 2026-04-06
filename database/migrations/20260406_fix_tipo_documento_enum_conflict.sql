-- ============================================================================
-- Migracion: Aislar enum tipo_documento de clientes y limpiar proveedores
-- Fecha: 2026-04-06
-- Objetivo:
--   1) Evitar conflicto de DROP TYPE al eliminar proveedores.tipo_documento
--   2) Mantener datos existentes de clientes.tipo_documento
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'tipo_documento'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = 'clientes_tipo_documento_enum'
    ) THEN
      CREATE TYPE public.clientes_tipo_documento_enum AS ENUM ('CC', 'NIT', 'CE', 'PAS', 'TI');
    END IF;

    ALTER TABLE public.clientes
      ALTER COLUMN tipo_documento DROP DEFAULT;

    ALTER TABLE public.clientes
      ALTER COLUMN tipo_documento
      TYPE public.clientes_tipo_documento_enum
      USING (tipo_documento::text::public.clientes_tipo_documento_enum);

    ALTER TABLE public.clientes
      ALTER COLUMN tipo_documento
      SET DEFAULT 'CC'::public.clientes_tipo_documento_enum;
  END IF;
END
$$;

ALTER TABLE public.proveedores
  DROP COLUMN IF EXISTS tipo_documento;

DO $$
DECLARE
  v_refs integer;
BEGIN
  SELECT COUNT(*)
  INTO v_refs
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE a.atttypid = 'public.tipo_documento'::regtype
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND n.nspname = 'public';

  IF v_refs = 0 THEN
    DROP TYPE IF EXISTS public.tipo_documento;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END
$$;

COMMIT;
