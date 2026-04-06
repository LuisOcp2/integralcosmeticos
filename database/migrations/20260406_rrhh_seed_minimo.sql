-- ============================================================================
-- Seed: RRHH minimo (1 area, 1 cargo, 1 empleado)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_area_id UUID;
  v_cargo_id UUID;
  v_sede_id UUID;
  v_usuario_id UUID;
BEGIN
  SELECT id
  INTO v_area_id
  FROM rrhh_areas
  WHERE nombre = 'AREA GENERAL'
  LIMIT 1;

  IF v_area_id IS NULL THEN
    INSERT INTO rrhh_areas (nombre, descripcion, activa)
    VALUES ('AREA GENERAL', 'Area base creada por seed minimo', TRUE)
    RETURNING id INTO v_area_id;
  END IF;

  SELECT id
  INTO v_cargo_id
  FROM rrhh_cargos
  WHERE nombre = 'CARGO GENERAL'
    AND "areaId" = v_area_id
  LIMIT 1;

  IF v_cargo_id IS NULL THEN
    INSERT INTO rrhh_cargos (nombre, "areaId", "salarioBase", nivel)
    VALUES ('CARGO GENERAL', v_area_id, 1500000, 'OPERATIVO')
    RETURNING id INTO v_cargo_id;
  END IF;

  SELECT id INTO v_sede_id FROM sedes ORDER BY "createdAt" ASC LIMIT 1;
  SELECT id INTO v_usuario_id FROM usuarios ORDER BY "createdAt" ASC LIMIT 1;

  IF v_sede_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM rrhh_empleados
      WHERE "numeroDocumento" = '900000001'
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
        v_usuario_id,
        'CC',
        '900000001',
        'Empleado',
        'Demo',
        'empleado.demo@integral.local',
        '3000000000',
        v_cargo_id,
        v_area_id,
        v_sede_id,
        'INDEFINIDO',
        CURRENT_DATE,
        'ACTIVO',
        1500000,
        TRUE
      );
    END IF;
  END IF;
END
$$;

COMMIT;
