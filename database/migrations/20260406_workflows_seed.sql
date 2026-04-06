-- ============================================================================
-- Seed minimo de Workflows (1 por trigger)
-- Fecha: 2026-04-06
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM usuarios
  WHERE rol = 'ADMIN'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No existe usuario ADMIN, seed de workflows omitido';
    RETURN;
  END IF;

  -- STOCK_BAJO_MINIMO
  INSERT INTO workflows (nombre, activo, "creadoPorId", "trigger", pasos, estadisticas)
  VALUES (
    'WF Stock Bajo Minimo',
    TRUE,
    v_admin_id,
    '{"tipo":"STOCK_BAJO_MINIMO","configuracion":{}}'::jsonb,
    ARRAY[
      '{"tipo":"ENVIAR_NOTIFICACION","config":{"usuarioId":"__ADMIN__","tipo":"ALERTA","categoria":"STOCK","titulo":"Stock bajo detectado","mensaje":"Se detecto stock por debajo del minimo","prioridad":"ALTA","accionLabel":"Ver inventario","accionRuta":"/reportes"}}'::jsonb
    ],
    '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  -- VENTA_COMPLETADA
  INSERT INTO workflows (nombre, activo, "creadoPorId", "trigger", pasos, estadisticas)
  VALUES (
    'WF Venta Completada',
    TRUE,
    v_admin_id,
    '{"tipo":"VENTA_COMPLETADA","configuracion":{}}'::jsonb,
    ARRAY[
      '{"tipo":"ENVIAR_NOTIFICACION","config":{"usuarioId":"__ADMIN__","tipo":"EXITO","categoria":"VENTA","titulo":"Nueva venta completada","mensaje":"Se registro una venta correctamente","prioridad":"MEDIA","accionLabel":"Ver POS","accionRuta":"/pos"}}'::jsonb
    ],
    '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  -- CLIENTE_NUEVO
  INSERT INTO workflows (nombre, activo, "creadoPorId", "trigger", pasos, estadisticas)
  VALUES (
    'WF Cliente Nuevo',
    TRUE,
    v_admin_id,
    '{"tipo":"CLIENTE_NUEVO","configuracion":{}}'::jsonb,
    ARRAY[
      '{"tipo":"ENVIAR_NOTIFICACION","config":{"usuarioId":"__ADMIN__","tipo":"INFO","categoria":"CRM","titulo":"Nuevo cliente registrado","mensaje":"Se ha registrado un nuevo cliente","prioridad":"MEDIA","accionLabel":"Ver clientes","accionRuta":"/clientes"}}'::jsonb,
      '{"tipo":"CREAR_ACTIVIDAD_CRM","config":{"tipoActividad":"TAREA","asunto":"Contactar cliente nuevo","descripcion":"Seguimiento automatico post-registro","realizadoPorId":"__ADMIN__"}}'::jsonb
    ],
    '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  -- FACTURA_VENCIDA
  INSERT INTO workflows (nombre, activo, "creadoPorId", "trigger", pasos, estadisticas)
  VALUES (
    'WF Factura Vencida',
    TRUE,
    v_admin_id,
    '{"tipo":"FACTURA_VENCIDA","configuracion":{}}'::jsonb,
    ARRAY[
      '{"tipo":"ENVIAR_NOTIFICACION","config":{"usuarioId":"__ADMIN__","tipo":"ALERTA","categoria":"FINANZAS","titulo":"Revision facturas vencidas","mensaje":"Ejecutar control diario de cartera","prioridad":"ALTA","accionLabel":"Ver comercial","accionRuta":"/comercial"}}'::jsonb
    ],
    '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  -- PROGRAMADO
  INSERT INTO workflows (nombre, activo, "creadoPorId", "trigger", pasos, estadisticas)
  VALUES (
    'WF Programado Cada 15 Min',
    TRUE,
    v_admin_id,
    '{"tipo":"PROGRAMADO","configuracion":{"expresionCron":"*/15 * * * *"}}'::jsonb,
    ARRAY[
      '{"tipo":"ENVIAR_NOTIFICACION","config":{"usuarioId":"__ADMIN__","tipo":"RECORDATORIO","categoria":"SISTEMA","titulo":"Heartbeat workflow","mensaje":"Ejecucion programada realizada","prioridad":"BAJA"}}'::jsonb
    ],
    '{"ejecuciones":0,"exitosas":0,"fallidas":0,"ultimaEjecucion":null}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  UPDATE workflows
  SET
    pasos = ARRAY(
      SELECT REPLACE(step::text, '__ADMIN__', v_admin_id::text)::jsonb
      FROM unnest(pasos) AS step
    )
  WHERE nombre IN (
    'WF Stock Bajo Minimo',
    'WF Venta Completada',
    'WF Cliente Nuevo',
    'WF Factura Vencida',
    'WF Programado Cada 15 Min'
  );
END
$$;

COMMIT;
