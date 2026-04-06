-- ============================================================================
-- Seed: RRHH demo (3-5 empleados repartidos por sede)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_area_id UUID;
  v_cargo_id UUID;
  rec RECORD;
  v_doc TEXT;
  v_nombre TEXT;
  v_apellido TEXT;
BEGIN
  SELECT id INTO v_area_id FROM rrhh_areas WHERE nombre = 'AREA GENERAL' LIMIT 1;
  IF v_area_id IS NULL THEN
    INSERT INTO rrhh_areas (nombre, descripcion, activa)
    VALUES ('AREA GENERAL', 'Area base creada por seed demo', TRUE)
    RETURNING id INTO v_area_id;
  END IF;

  SELECT id INTO v_cargo_id FROM rrhh_cargos WHERE nombre = 'CARGO GENERAL' AND "areaId" = v_area_id LIMIT 1;
  IF v_cargo_id IS NULL THEN
    INSERT INTO rrhh_cargos (nombre, "areaId", "salarioBase", nivel)
    VALUES ('CARGO GENERAL', v_area_id, 1500000, 'OPERATIVO')
    RETURNING id INTO v_cargo_id;
  END IF;

  FOR rec IN
    SELECT id, row_number() OVER (ORDER BY "createdAt" ASC) AS rn
    FROM sedes
    ORDER BY "createdAt" ASC
    LIMIT 5
  LOOP
    v_doc := '900100' || LPAD(rec.rn::TEXT, 3, '0');

    CASE rec.rn
      WHEN 1 THEN v_nombre := 'Laura'; v_apellido := 'Martinez';
      WHEN 2 THEN v_nombre := 'Carlos'; v_apellido := 'Gomez';
      WHEN 3 THEN v_nombre := 'Natalia'; v_apellido := 'Diaz';
      WHEN 4 THEN v_nombre := 'Andres'; v_apellido := 'Ruiz';
      ELSE v_nombre := 'Paula'; v_apellido := 'Vargas';
    END CASE;

    IF NOT EXISTS (
      SELECT 1
      FROM rrhh_empleados
      WHERE "numeroDocumento" = v_doc
    ) THEN
      INSERT INTO rrhh_empleados (
        "usuarioId",
        "tipoDocumento",
        "numeroDocumento",
        nombre,
        apellido,
        email,
        telefono,
        "cargoId",
        "areaId",
        "sedeId",
        "tipoContrato",
        "fechaIngreso",
        estado,
        "salarioBase",
        "auxilioTransporte"
      ) VALUES (
        NULL,
        'CC',
        v_doc,
        v_nombre,
        v_apellido,
        LOWER(v_nombre || '.' || v_apellido || '@integral.local'),
        '30000000' || rec.rn::TEXT,
        v_cargo_id,
        v_area_id,
        rec.id,
        'INDEFINIDO',
        CURRENT_DATE,
        'ACTIVO',
        1600000,
        TRUE
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
