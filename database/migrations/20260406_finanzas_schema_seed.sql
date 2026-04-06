-- Fase: Finanzas y tesoreria
-- Objetivo: crear esquema base e insertar datos minimos de demo

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_cuenta_bancaria_enum') THEN
    CREATE TYPE tipo_cuenta_bancaria_enum AS ENUM (
      'CORRIENTE',
      'AHORROS',
      'NEQUI',
      'DAVIPLATA',
      'OTRO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento_bancario_enum') THEN
    CREATE TYPE tipo_movimiento_bancario_enum AS ENUM ('INGRESO', 'EGRESO', 'TRASLADO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_movimiento_bancario_enum') THEN
    CREATE TYPE categoria_movimiento_bancario_enum AS ENUM (
      'VENTA',
      'COBRO_FACTURA',
      'PAGO_PROVEEDOR',
      'NOMINA',
      'IMPUESTO',
      'GASTO_OPERATIVO',
      'OTRO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_periodo_financiero_enum') THEN
    CREATE TYPE estado_periodo_financiero_enum AS ENUM ('ABIERTO', 'CERRADO', 'BLOQUEADO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_presupuesto_mensual_enum') THEN
    CREATE TYPE tipo_presupuesto_mensual_enum AS ENUM ('INGRESO', 'EGRESO');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  banco VARCHAR(100) NOT NULL,
  "tipoCuenta" tipo_cuenta_bancaria_enum NOT NULL,
  "numeroCuenta" VARCHAR(30) NOT NULL UNIQUE,
  "saldoActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "saldoInicial" DECIMAL(14,2) NOT NULL,
  "fechaSaldoInicial" DATE NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  moneda VARCHAR(3) NOT NULL DEFAULT 'COP'
);

CREATE TABLE IF NOT EXISTS finanzas_periodos_contables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  estado estado_periodo_financiero_enum NOT NULL DEFAULT 'ABIERTO',
  "fechaCierre" TIMESTAMPTZ,
  "cerradoPorId" UUID,
  CONSTRAINT uq_finanzas_periodos_anio_mes UNIQUE (ano, mes)
);

CREATE TABLE IF NOT EXISTS presupuestos_mensuales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "periodoId" UUID NOT NULL REFERENCES finanzas_periodos_contables(id) ON DELETE CASCADE,
  categoria VARCHAR(100) NOT NULL,
  tipo tipo_presupuesto_mensual_enum NOT NULL,
  "montoPresupuestado" DECIMAL(14,2) NOT NULL,
  "montoEjecutado" DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT uq_presupuesto_periodo_categoria_tipo UNIQUE ("periodoId", categoria, tipo)
);

CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "cuentaBancariaId" UUID NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  referencia VARCHAR(100),
  tipo tipo_movimiento_bancario_enum NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  "saldoDespues" DECIMAL(14,2) NOT NULL,
  categoria categoria_movimiento_bancario_enum NOT NULL,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  "conciliadoEn" TIMESTAMPTZ,
  "ventaId" UUID,
  "facturaId" UUID,
  "ordenCompraId" UUID,
  "registradoPorId" UUID NOT NULL REFERENCES usuarios(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_cuenta ON movimientos_bancarios("cuentaBancariaId");
CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_fecha ON movimientos_bancarios(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_referencia ON movimientos_bancarios(referencia);

INSERT INTO cuentas_bancarias (
  nombre,
  banco,
  "tipoCuenta",
  "numeroCuenta",
  "saldoActual",
  "saldoInicial",
  "fechaSaldoInicial",
  activa,
  "esPrincipal",
  moneda
)
VALUES
  ('Cuenta Principal Operativa', 'Bancolombia', 'CORRIENTE', '0102030405', 5200000, 5200000, CURRENT_DATE, true, true, 'COP'),
  ('Ahorros Reserva', 'Davivienda', 'AHORROS', '0203040506', 2100000, 2100000, CURRENT_DATE, true, false, 'COP'),
  ('Recaudo Nequi', 'Nequi', 'NEQUI', '3001234567', 450000, 450000, CURRENT_DATE, true, false, 'COP')
ON CONFLICT ("numeroCuenta") DO UPDATE SET
  nombre = EXCLUDED.nombre,
  banco = EXCLUDED.banco,
  "tipoCuenta" = EXCLUDED."tipoCuenta",
  activa = EXCLUDED.activa,
  "esPrincipal" = EXCLUDED."esPrincipal";

WITH periodo_actual AS (
  INSERT INTO finanzas_periodos_contables (ano, mes, estado)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, 'ABIERTO')
  ON CONFLICT (ano, mes) DO UPDATE SET estado = finanzas_periodos_contables.estado
  RETURNING id
),
periodo_ref AS (
  SELECT id FROM periodo_actual
  UNION
  SELECT id
  FROM finanzas_periodos_contables
  WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)::INT
    AND mes = EXTRACT(MONTH FROM CURRENT_DATE)::INT
  LIMIT 1
)
INSERT INTO presupuestos_mensuales ("periodoId", categoria, tipo, "montoPresupuestado", "montoEjecutado")
SELECT p.id, seed.categoria, seed.tipo::tipo_presupuesto_mensual_enum, seed.presupuesto, 0
FROM periodo_ref p
CROSS JOIN (
  VALUES
    ('VENTA', 'INGRESO', 48000000::DECIMAL(14,2)),
    ('COBRO_FACTURA', 'INGRESO', 9000000::DECIMAL(14,2)),
    ('PAGO_PROVEEDOR', 'EGRESO', 22000000::DECIMAL(14,2)),
    ('NOMINA', 'EGRESO', 10000000::DECIMAL(14,2)),
    ('GASTO_OPERATIVO', 'EGRESO', 6000000::DECIMAL(14,2)),
    ('IMPUESTO', 'EGRESO', 3500000::DECIMAL(14,2))
) AS seed(categoria, tipo, presupuesto)
ON CONFLICT ("periodoId", categoria, tipo) DO UPDATE SET
  "montoPresupuestado" = EXCLUDED."montoPresupuestado";

WITH usuario_ref AS (
  SELECT id FROM usuarios ORDER BY "createdAt" ASC LIMIT 1
),
cuenta_principal AS (
  SELECT id, "saldoActual"
  FROM cuentas_bancarias
  WHERE "numeroCuenta" = '0102030405'
  LIMIT 1
),
movs AS (
  SELECT
    c.id AS "cuentaBancariaId",
    CURRENT_DATE - 4 AS fecha,
    'Ingreso demo por recaudo diario'::TEXT AS descripcion,
    'DEMO-ING-1'::VARCHAR(100) AS referencia,
    'INGRESO'::tipo_movimiento_bancario_enum AS tipo,
    850000::DECIMAL(14,2) AS monto,
    (c."saldoActual" + 850000)::DECIMAL(14,2) AS "saldoDespues",
    'VENTA'::categoria_movimiento_bancario_enum AS categoria,
    true AS conciliado,
    NOW() AS "conciliadoEn"
  FROM cuenta_principal c
  UNION ALL
  SELECT
    c.id,
    CURRENT_DATE - 2,
    'Egreso demo pago proveedor principal',
    'DEMO-EGR-1',
    'EGRESO'::tipo_movimiento_bancario_enum,
    430000::DECIMAL(14,2),
    (c."saldoActual" + 420000)::DECIMAL(14,2),
    'PAGO_PROVEEDOR'::categoria_movimiento_bancario_enum,
    false,
    NULL::TIMESTAMPTZ
  FROM cuenta_principal c
)
INSERT INTO movimientos_bancarios (
  "cuentaBancariaId",
  fecha,
  descripcion,
  referencia,
  tipo,
  monto,
  "saldoDespues",
  categoria,
  conciliado,
  "conciliadoEn",
  "registradoPorId"
)
SELECT
  m."cuentaBancariaId",
  m.fecha,
  m.descripcion,
  m.referencia,
  m.tipo,
  m.monto,
  m."saldoDespues",
  m.categoria,
  m.conciliado,
  m."conciliadoEn",
  u.id
FROM movs m
CROSS JOIN usuario_ref u
ON CONFLICT DO NOTHING;
