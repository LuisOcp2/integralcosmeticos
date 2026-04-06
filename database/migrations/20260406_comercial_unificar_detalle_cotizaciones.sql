-- ============================================================================
-- Migracion: Unificacion legacy cotizacion_detalles vs detalle_cotizaciones
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'detalle_cotizaciones'
  ) THEN
    INSERT INTO cotizacion_detalles (
      id,
      "cotizacionId",
      "varianteId",
      "productoId",
      cantidad,
      precio_unitario,
      descuento,
      subtotal,
      observaciones
    )
    SELECT
      dc.id,
      dc."cotizacionId",
      dc."varianteId",
      v."productoId",
      dc.cantidad,
      dc."precioUnitario",
      dc.descuento,
      dc.subtotal,
      dc.descripcion
    FROM detalle_cotizaciones dc
    INNER JOIN variantes v ON v.id = dc."varianteId"
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE detalle_cotizaciones;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_cotizacion ON cotizacion_detalles("cotizacionId");
CREATE INDEX IF NOT EXISTS idx_cotizacion_detalles_variante ON cotizacion_detalles("varianteId");

COMMIT;
