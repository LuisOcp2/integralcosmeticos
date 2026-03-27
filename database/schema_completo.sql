-- =============================================================================
-- INTEGRAL COSMÉTICOS — SCHEMA COMPLETO PostgreSQL 16
-- Generado: 2026-03-27
-- Versión: 2.0 (3 fases)
-- Autor: Luis Ocampo
-- =============================================================================
-- INSTRUCCIONES DE USO:
--   1. Conectarse a PostgreSQL: psql -U admin -d cosmeticos_db
--   2. O en DBeaver: abrir este archivo y ejecutar con F5
--   3. Para resetear: ejecutar DROP SCHEMA public CASCADE; CREATE SCHEMA public;
--      ANTES de correr este script
-- =============================================================================

BEGIN;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS GLOBALES
-- =============================================================================

CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'SUPERVISOR', 'CAJERO', 'BODEGUERO');
CREATE TYPE tipo_sede AS ENUM ('PRINCIPAL', 'SUCURSAL', 'BODEGA');
CREATE TYPE tipo_documento AS ENUM ('CC', 'NIT', 'CE', 'PAS', 'TI');
CREATE TYPE nivel_cliente AS ENUM ('BRONCE', 'PLATA', 'ORO', 'VIP');
CREATE TYPE estado_venta AS ENUM ('COMPLETADA', 'ANULADA', 'SUSPENDIDA', 'DEVUELTA_PARCIAL');
CREATE TYPE metodo_pago AS ENUM ('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'MIXTO');
CREATE TYPE tipo_movimiento_inv AS ENUM ('ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE', 'DEVOLUCION', 'COMPRA');
CREATE TYPE estado_compra AS ENUM ('PENDIENTE', 'RECIBIDA', 'PARCIAL', 'CANCELADA');
CREATE TYPE estado_pago_compra AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETADO', 'CANCELADO');
CREATE TYPE estado_devolucion AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'FINALIZADA', 'ANULADA');
CREATE TYPE tipo_devolucion AS ENUM ('TOTAL', 'PARCIAL');
CREATE TYPE condicion_producto AS ENUM ('NUEVO', 'USADO_BUENO', 'USADO_REGULAR', 'DAÑADO', 'DEFECTUOSO');
CREATE TYPE accion_devolucion AS ENUM ('REINGRESO_INVENTARIO', 'DESCARTE', 'DEVOLUCION_PROVEEDOR');
CREATE TYPE estado_traspaso AS ENUM ('PENDIENTE', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO');
CREATE TYPE tipo_ajuste AS ENUM ('ENTRADA_MANUAL', 'SALIDA_MANUAL', 'CORRECCION', 'INVENTARIO_FISICO', 'MERMA', 'DETERIORO');
CREATE TYPE estado_promocion AS ENUM ('ACTIVA', 'INACTIVA', 'VENCIDA', 'PROGRAMADA');
CREATE TYPE tipo_promocion AS ENUM ('DESCUENTO_PORCENTAJE', 'DESCUENTO_FIJO', 'SEGUNDO_AL_X_PORCIENTO', 'REGALO', 'PUNTOS_X2');
CREATE TYPE estado_cotizacion AS ENUM ('PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA');
CREATE TYPE estado_conteo AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CERRADO');
CREATE TYPE tipo_evento_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');
CREATE TYPE tipo_notificacion AS ENUM ('STOCK_BAJO', 'TRASPASO_PENDIENTE', 'VENTA_ANULADA', 'CIERRE_CAJA', 'SISTEMA', 'DEVOLUCION');
CREATE TYPE tipo_movimiento_caja AS ENUM ('APERTURA', 'VENTA', 'DEVOLUCION', 'GASTO', 'INGRESO_OTRO', 'CIERRE');
CREATE TYPE estado_sync AS ENUM ('PENDIENTE', 'SINCRONIZADO', 'ERROR', 'IGNORADO');

-- =============================================================================
-- ███████╗ █████╗ ███████╗███████╗    ██╗
-- ██╔════╝██╔══██╗██╔════╝██╔════╝    ██║
-- █████╗  ███████║███████╗█████╗      ██║
-- ██╔══╝  ██╔══██║╚════██║██╔══╝      ╚═╝
-- ██║     ██║  ██║███████║███████╗    ██╗
-- ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝
-- FASE 1: NÚCLEO DEL SISTEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 SEDES
-- -----------------------------------------------------------------------------
CREATE TABLE sedes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo              VARCHAR(20) UNIQUE NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    direccion           TEXT,
    ciudad              VARCHAR(100) NOT NULL DEFAULT 'Cali',
    departamento        VARCHAR(100) DEFAULT 'Valle del Cauca',
    telefono            VARCHAR(20),
    email               VARCHAR(150),
    tipo                tipo_sede NOT NULL DEFAULT 'SUCURSAL',
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    nit_sede            VARCHAR(20),
    responsable         VARCHAR(150),
    capacidad_max_stock INTEGER,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sedes IS 'Tiendas, bodegas y sede principal de Integral Cosméticos';

-- -----------------------------------------------------------------------------
-- 1.2 USUARIOS
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    rol             rol_usuario NOT NULL DEFAULT 'CAJERO',
    "sedeId"        UUID REFERENCES sedes(id) ON DELETE SET NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    intentos_login  INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    avatar_url      VARCHAR(500),
    telefono        VARCHAR(20),
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles y asignación a sede';

-- -----------------------------------------------------------------------------
-- 1.3 CATEGORÍAS DE PRODUCTOS
-- -----------------------------------------------------------------------------
CREATE TABLE categorias (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    imagen_url  VARCHAR(500),
    orden       INTEGER DEFAULT 0,
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subcategorías (autorreferencial)
ALTER TABLE categorias ADD COLUMN "categoriaPadreId" UUID REFERENCES categorias(id) ON DELETE SET NULL;

COMMENT ON TABLE categorias IS 'Categorías y subcategorías: Maquillaje > Labios, Skincare > Hidratantes, etc.';

-- -----------------------------------------------------------------------------
-- 1.4 MARCAS
-- -----------------------------------------------------------------------------
CREATE TABLE marcas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) UNIQUE NOT NULL,
    descripcion     TEXT,
    logo_url        VARCHAR(500),
    sitio_web       VARCHAR(300),
    pais_origen     VARCHAR(100),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.5 ATRIBUTOS DE VARIANTE (tono, presentación, volumen — cosmos-specific)
-- -----------------------------------------------------------------------------
CREATE TABLE atributos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(100) UNIQUE NOT NULL,  -- 'Tono', 'Presentación', 'Volumen', 'Acabado'
    tipo        VARCHAR(50) NOT NULL DEFAULT 'texto',  -- 'color', 'texto', 'numero'
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE atributo_valores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "atributoId"    UUID NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
    valor           VARCHAR(100) NOT NULL,  -- 'Nude 01', '50ml', 'Matte'
    codigo_hex      VARCHAR(7),             -- Para atributos tipo color
    orden           INTEGER DEFAULT 0,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("atributoId", valor)
);

-- -----------------------------------------------------------------------------
-- 1.6 PROVEEDORES
-- -----------------------------------------------------------------------------
CREATE TABLE proveedores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo              VARCHAR(30) UNIQUE NOT NULL,
    razon_social        VARCHAR(200) NOT NULL,
    nombre_comercial    VARCHAR(200),
    nit                 VARCHAR(30) UNIQUE,
    tipo_documento      tipo_documento DEFAULT 'NIT',
    email               VARCHAR(150),
    telefono            VARCHAR(20),
    celular             VARCHAR(20),
    direccion           TEXT,
    ciudad              VARCHAR(100),
    departamento        VARCHAR(100),
    pais                VARCHAR(100) DEFAULT 'Colombia',
    contacto_nombre     VARCHAR(150),
    contacto_cargo      VARCHAR(100),
    contacto_telefono   VARCHAR(20),
    sitio_web           VARCHAR(300),
    condiciones_pago    VARCHAR(200),  -- '30 días', 'Contado', etc.
    descuento_proveedor DECIMAL(5,2) DEFAULT 0,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.7 PRODUCTOS
-- -----------------------------------------------------------------------------
CREATE TABLE productos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    descripcion_larga   TEXT,
    codigo_interno      VARCHAR(50) UNIQUE NOT NULL,
    "categoriaId"       UUID REFERENCES categorias(id) ON DELETE SET NULL,
    "marcaId"           UUID REFERENCES marcas(id) ON DELETE SET NULL,
    "proveedorId"       UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    precio_venta        DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_costo        DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto            DECIMAL(5,2) NOT NULL DEFAULT 19.00,  -- IVA Colombia
    margen_minimo       DECIMAL(5,2) DEFAULT 30.00,           -- % margen mínimo
    imagen_url          VARCHAR(500),
    imagenes_extra      TEXT[],                                -- Array URLs
    ingredientes        TEXT,                                  -- Para cosméticos
    modo_uso            TEXT,
    precauciones        TEXT,
    registro_invima     VARCHAR(50),                           -- Registro INVIMA obligatorio cosméticos CO
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    destacado           BOOLEAN DEFAULT FALSE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN productos.registro_invima IS 'Número de registro INVIMA, obligatorio para cosméticos en Colombia';

-- -----------------------------------------------------------------------------
-- 1.8 VARIANTES DE PRODUCTO
-- -----------------------------------------------------------------------------
CREATE TABLE variantes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productoId"    UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,   -- 'Tono Nude 01 - 50ml'
    sku             VARCHAR(100) UNIQUE NOT NULL,
    codigo_barras   VARCHAR(100) UNIQUE,
    precio_extra    DECIMAL(12,2) NOT NULL DEFAULT 0,  -- Adicional al precio base
    precio_venta    DECIMAL(12,2),                     -- Override: si NULL usa producto.precio_venta + precio_extra
    precio_costo    DECIMAL(12,2),                     -- Override precio costo
    imagen_url      VARCHAR(500),
    peso_gramos     DECIMAL(8,2),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla pivote: qué valores de atributo tiene cada variante
CREATE TABLE variante_atributos (
    "varianteId"    UUID NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
    "atributoId"    UUID NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
    "valorId"       UUID NOT NULL REFERENCES atributo_valores(id) ON DELETE CASCADE,
    PRIMARY KEY ("varianteId", "atributoId")
);

-- -----------------------------------------------------------------------------
-- 1.9 STOCK POR SEDE
-- -----------------------------------------------------------------------------
CREATE TABLE stock_sedes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "varianteId"            UUID NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
    "sedeId"                UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    cantidad                INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    stock_minimo            INTEGER NOT NULL DEFAULT 5,
    stock_maximo            INTEGER DEFAULT 100,
    ubicacion_fisica        VARCHAR(100),  -- 'Estante A-3', 'Vitrina 2'
    ultima_actualizacion    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("varianteId", "sedeId")
);

COMMENT ON TABLE stock_sedes IS 'Stock actual de cada variante por sede. Se actualiza con triggers.';

-- -----------------------------------------------------------------------------
-- 1.10 CLIENTES
-- -----------------------------------------------------------------------------
CREATE TABLE clientes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100),
    tipo_documento      tipo_documento DEFAULT 'CC',
    documento           VARCHAR(20) UNIQUE,
    email               VARCHAR(150),
    telefono            VARCHAR(20),
    celular             VARCHAR(20),
    direccion           TEXT,
    ciudad              VARCHAR(100),
    fecha_nacimiento    DATE,
    genero              VARCHAR(20),
    nivel_fidelidad     nivel_cliente NOT NULL DEFAULT 'BRONCE',
    puntos_fidelidad    INTEGER NOT NULL DEFAULT 0,
    total_compras_hist  DECIMAL(14,2) NOT NULL DEFAULT 0,
    num_compras         INTEGER NOT NULL DEFAULT 0,
    ultima_compra       TIMESTAMPTZ,
    "sedeId"            UUID REFERENCES sedes(id) ON DELETE SET NULL,  -- Sede donde se registró
    notas               TEXT,
    acepta_marketing    BOOLEAN DEFAULT TRUE,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE clientes IS 'CRM clientes con programa de fidelidad Bronce/Plata/Oro/VIP';

-- Reglas de fidelidad
CREATE TABLE reglas_fidelidad (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nivel               nivel_cliente UNIQUE NOT NULL,
    monto_minimo_acum   DECIMAL(12,2) NOT NULL,  -- Total histórico compras para subir
    porcentaje_puntos   DECIMAL(5,2) NOT NULL DEFAULT 1.0,  -- % del total que se convierte en puntos
    descuento_auto      DECIMAL(5,2) DEFAULT 0,   -- % descuento automático por nivel
    activa              BOOLEAN DEFAULT TRUE,
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSERT datos iniciales de fidelidad
INSERT INTO reglas_fidelidad (nivel, monto_minimo_acum, porcentaje_puntos, descuento_auto) VALUES
    ('BRONCE', 0,         1.0, 0),
    ('PLATA',  500000,    1.5, 3),
    ('ORO',    2000000,   2.0, 5),
    ('VIP',    10000000,  3.0, 10);

-- -----------------------------------------------------------------------------
-- 1.11 CAJAS
-- -----------------------------------------------------------------------------
CREATE TABLE cajas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(30) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    "sedeId"    UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sesiones de caja (apertura/cierre)
CREATE TABLE sesiones_caja (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cajaId"                UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
    "usuarioAperturaId"     UUID NOT NULL REFERENCES usuarios(id),
    "usuarioCierreId"       UUID REFERENCES usuarios(id),
    fecha_apertura          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre            TIMESTAMPTZ,
    monto_inicial           DECIMAL(12,2) NOT NULL DEFAULT 0,
    monto_final_declarado   DECIMAL(12,2),
    monto_final_sistema     DECIMAL(12,2),  -- Calculado automáticamente
    diferencia              DECIMAL(12,2),
    total_ventas            DECIMAL(12,2) DEFAULT 0,
    total_devoluciones      DECIMAL(12,2) DEFAULT 0,
    total_gastos            DECIMAL(12,2) DEFAULT 0,
    num_transacciones       INTEGER DEFAULT 0,
    observaciones_apertura  TEXT,
    observaciones_cierre    TEXT,
    activa                  BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = caja abierta
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sesiones_caja IS 'Reemplaza cierre_caja. Una sesión por turno por caja.';

-- Movimientos de caja (cada transacción)
CREATE TABLE caja_movimientos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sesionCajaId"      UUID NOT NULL REFERENCES sesiones_caja(id) ON DELETE CASCADE,
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    tipo                tipo_movimiento_caja NOT NULL,
    concepto            VARCHAR(300) NOT NULL,
    monto               DECIMAL(12,2) NOT NULL,
    es_ingreso          BOOLEAN NOT NULL,  -- TRUE = entrada de dinero, FALSE = salida
    "referenciaId"      UUID,              -- ID de venta, gasto, etc.
    tipo_referencia     VARCHAR(50),       -- 'venta', 'gasto', 'devolucion'
    num_comprobante     VARCHAR(50),
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gastos operativos registrados en caja
CREATE TABLE tipos_gasto (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre                  VARCHAR(100) UNIQUE NOT NULL,
    descripcion             TEXT,
    requiere_autorizacion   BOOLEAN DEFAULT FALSE,
    monto_maximo            DECIMAL(10,2),
    activo                  BOOLEAN DEFAULT TRUE,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gastos_operativos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sesionCajaId"      UUID NOT NULL REFERENCES sesiones_caja(id),
    "tipoGastoId"       UUID NOT NULL REFERENCES tipos_gasto(id),
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    "autorizadoPorId"   UUID REFERENCES usuarios(id),
    descripcion         VARCHAR(300) NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    num_soporte         VARCHAR(100),
    fecha_gasto         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activo              BOOLEAN DEFAULT TRUE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.12 VENTAS
-- -----------------------------------------------------------------------------
CREATE TABLE ventas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero              VARCHAR(30) UNIQUE NOT NULL,  -- VTA-2026-00001
    "sedeId"            UUID NOT NULL REFERENCES sedes(id),
    "sesionCajaId"      UUID REFERENCES sesiones_caja(id),
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    "clienteId"         UUID REFERENCES clientes(id) ON DELETE SET NULL,
    subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total               DECIMAL(12,2) NOT NULL DEFAULT 0,
    metodo_pago         metodo_pago NOT NULL DEFAULT 'EFECTIVO',
    -- Split de pago
    monto_efectivo      DECIMAL(12,2) DEFAULT 0,
    monto_tarjeta       DECIMAL(12,2) DEFAULT 0,
    monto_transferencia DECIMAL(12,2) DEFAULT 0,
    monto_otro          DECIMAL(12,2) DEFAULT 0,
    -- Fidelidad
    puntos_ganados      INTEGER DEFAULT 0,
    puntos_usados       INTEGER DEFAULT 0,
    descuento_puntos    DECIMAL(12,2) DEFAULT 0,
    -- Estado
    estado              estado_venta NOT NULL DEFAULT 'COMPLETADA',
    motivo_anulacion    TEXT,
    "anuladaPorId"      UUID REFERENCES usuarios(id),
    fecha_anulacion     TIMESTAMPTZ,
    -- Referencia cotización
    "cotizacionId"      UUID,  -- FK se agrega después
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN ventas.numero IS 'Numeración consecutiva formato VTA-YYYY-NNNNN. Obligatorio DIAN.';

-- Detalle líneas de venta
CREATE TABLE detalle_ventas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ventaId"           UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     DECIMAL(12,2) NOT NULL,
    precio_costo_snap   DECIMAL(12,2),  -- Snapshot costo al momento de vender
    descuento_item      DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto_item       DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal            DECIMAL(12,2) NOT NULL,
    "promocionId"       UUID,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE detalle_ventas IS 'Líneas de cada venta. precio_costo_snap permite calcular rentabilidad histórica.';

-- Pagos adicionales (para split de pago)
CREATE TABLE venta_pagos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ventaId"       UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    metodo_pago     metodo_pago NOT NULL,
    monto           DECIMAL(12,2) NOT NULL,
    referencia      VARCHAR(100),  -- Número aprobación tarjeta, etc.
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Secuencia para numeración de ventas
CREATE SEQUENCE seq_ventas_num START WITH 1 INCREMENT BY 1;

-- =============================================================================
-- ███████╗ █████╗ ███████╗███████╗    ██████╗
-- ██╔════╝██╔══██╗██╔════╝██╔════╝    ╚════██╗
-- █████╗  ███████║███████╗█████╗       █████╔╝
-- ██╔══╝  ██╔══██║╚════██║██╔══╝      ██╔═══╝
-- ██║     ██║  ██║███████║███████╗    ███████╗
-- ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝
-- FASE 2: OPERACIONES Y TRAZABILIDAD
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 MOVIMIENTOS DE INVENTARIO (Auditoría completa)
-- -----------------------------------------------------------------------------
CREATE TABLE movimientos_inventario (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_doc          VARCHAR(40) UNIQUE NOT NULL,  -- MOV-2026-00001
    tipo                tipo_movimiento_inv NOT NULL,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    "sedeOrigenId"      UUID REFERENCES sedes(id),
    "sedeDestinoId"     UUID REFERENCES sedes(id),
    cantidad            INTEGER NOT NULL,
    stock_anterior      INTEGER NOT NULL,
    stock_nuevo         INTEGER NOT NULL,
    costo_unitario      DECIMAL(12,2),
    motivo              TEXT,
    -- Referencia al origen del movimiento
    "referenciaId"      UUID,
    tipo_referencia     VARCHAR(50),  -- 'venta', 'compra', 'traspaso', 'ajuste', 'devolucion'
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_inv_variante ON movimientos_inventario("varianteId");
CREATE INDEX idx_mov_inv_sede ON movimientos_inventario("sedeDestinoId");
CREATE INDEX idx_mov_inv_fecha ON movimientos_inventario("createdAt");

COMMENT ON TABLE movimientos_inventario IS 'Auditoría completa de todos los movimientos de inventario. Registro DIAN.';

-- Secuencia para numeración documentos
CREATE SEQUENCE seq_movimientos_num START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- 2.2 COMPRAS A PROVEEDORES
-- -----------------------------------------------------------------------------
CREATE TABLE compras (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_compra       VARCHAR(40) UNIQUE NOT NULL,  -- CMP-2026-00001
    "proveedorId"       UUID NOT NULL REFERENCES proveedores(id),
    "sedeId"            UUID NOT NULL REFERENCES sedes(id),
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    numero_factura_prov VARCHAR(100),  -- Número factura del proveedor
    fecha_compra        DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_recepcion     TIMESTAMPTZ,
    fecha_vencimiento   DATE,
    subtotal            DECIMAL(14,2) NOT NULL DEFAULT 0,
    iva                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento           DECIMAL(12,2) NOT NULL DEFAULT 0,
    total               DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_abonado       DECIMAL(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente     DECIMAL(14,2) NOT NULL DEFAULT 0,
    estado              estado_compra NOT NULL DEFAULT 'PENDIENTE',
    estado_pago         estado_pago_compra NOT NULL DEFAULT 'PENDIENTE',
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compra_detalles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "compraId"          UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     DECIMAL(12,2) NOT NULL,
    subtotal            DECIMAL(12,2) NOT NULL,
    cantidad_recibida   INTEGER DEFAULT 0,
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abonos a facturas de compra
CREATE TABLE abonos_compra (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "compraId"          UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    monto               DECIMAL(14,2) NOT NULL,
    fecha_abono         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metodo_pago         metodo_pago NOT NULL DEFAULT 'TRANSFERENCIA',
    num_comprobante     VARCHAR(100),
    evidencia_url       VARCHAR(500),
    estado              VARCHAR(30) DEFAULT 'completado',
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE seq_compras_num START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- 2.3 DEVOLUCIONES
-- -----------------------------------------------------------------------------
CREATE TABLE devoluciones (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_devolucion       VARCHAR(40) UNIQUE NOT NULL,  -- DEV-2026-00001
    "ventaId"               UUID NOT NULL REFERENCES ventas(id),
    "clienteId"             UUID REFERENCES clientes(id),
    "usuarioProcesaId"      UUID NOT NULL REFERENCES usuarios(id),
    "usuarioAutorizaId"     UUID REFERENCES usuarios(id),
    fecha_devolucion        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_autorizacion      TIMESTAMPTZ,
    tipo                    tipo_devolucion NOT NULL DEFAULT 'PARCIAL',
    motivo                  TEXT NOT NULL,
    estado                  estado_devolucion NOT NULL DEFAULT 'PENDIENTE',
    subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto                DECIMAL(12,2) NOT NULL DEFAULT 0,
    total                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    requiere_autorizacion   BOOLEAN DEFAULT FALSE,
    observaciones           TEXT,
    activa                  BOOLEAN DEFAULT TRUE,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devolucion_detalles (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "devolucionId"              UUID NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
    "detalleVentaId"            UUID NOT NULL REFERENCES detalle_ventas(id),
    "varianteId"                UUID NOT NULL REFERENCES variantes(id),
    "productoId"                UUID NOT NULL REFERENCES productos(id),
    cantidad_devuelta           INTEGER NOT NULL CHECK (cantidad_devuelta > 0),
    precio_unitario_original    DECIMAL(12,2) NOT NULL,
    subtotal_devolucion         DECIMAL(12,2) NOT NULL,
    condicion                   condicion_producto NOT NULL DEFAULT 'NUEVO',
    accion                      accion_devolucion NOT NULL DEFAULT 'REINGRESO_INVENTARIO',
    motivo_detalle              TEXT,
    activo                      BOOLEAN DEFAULT TRUE,
    "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notas crédito generadas por devoluciones
CREATE TABLE notas_credito (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero              VARCHAR(40) UNIQUE NOT NULL,  -- NC-2026-00001
    "devolucionId"      UUID NOT NULL REFERENCES devoluciones(id),
    "clienteId"         UUID NOT NULL REFERENCES clientes(id),
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    monto               DECIMAL(12,2) NOT NULL,
    monto_usado         DECIMAL(12,2) NOT NULL DEFAULT 0,
    saldo               DECIMAL(12,2) NOT NULL,
    fecha_emision       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento   TIMESTAMPTZ,
    activa              BOOLEAN DEFAULT TRUE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE seq_devoluciones_num START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_notas_credito_num START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- 2.4 TRASPASOS ENTRE SEDES
-- -----------------------------------------------------------------------------
CREATE TABLE traspasos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_traspaso     VARCHAR(40) UNIQUE NOT NULL,  -- TRP-2026-00001
    "sedeOrigenId"      UUID NOT NULL REFERENCES sedes(id),
    "sedeDestinoId"     UUID NOT NULL REFERENCES sedes(id),
    "usuarioSolicitaId" UUID NOT NULL REFERENCES usuarios(id),
    "usuarioApruebаId"  UUID REFERENCES usuarios(id),
    "usuarioRecibeId"   UUID REFERENCES usuarios(id),
    fecha_solicitud     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_envio         TIMESTAMPTZ,
    fecha_recepcion     TIMESTAMPTZ,
    estado              estado_traspaso NOT NULL DEFAULT 'PENDIENTE',
    motivo              TEXT,
    observaciones       TEXT,
    activo              BOOLEAN DEFAULT TRUE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE traspaso_detalles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "traspasoId"        UUID NOT NULL REFERENCES traspasos(id) ON DELETE CASCADE,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    cantidad_enviada    INTEGER NOT NULL CHECK (cantidad_enviada > 0),
    cantidad_recibida   INTEGER,
    diferencia          INTEGER GENERATED ALWAYS AS (COALESCE(cantidad_recibida, 0) - cantidad_enviada) STORED,
    observaciones       TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE seq_traspasos_num START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- 2.5 CONTEOS DE INVENTARIO FÍSICO
-- -----------------------------------------------------------------------------
CREATE TABLE conteos_inventario (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre                  VARCHAR(150) NOT NULL,
    "sedeId"                UUID NOT NULL REFERENCES sedes(id),
    "usuarioResponsableId"  UUID NOT NULL REFERENCES usuarios(id),
    tipo_conteo             VARCHAR(50) DEFAULT 'general',  -- general, parcial, ciclico
    fecha_programada        TIMESTAMPTZ NOT NULL,
    fecha_inicio            TIMESTAMPTZ,
    fecha_cierre            TIMESTAMPTZ,
    estado                  estado_conteo NOT NULL DEFAULT 'PENDIENTE',
    observaciones           TEXT,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conteo_detalles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conteoId"          UUID NOT NULL REFERENCES conteos_inventario(id) ON DELETE CASCADE,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    stock_sistema       INTEGER NOT NULL,
    stock_contado       INTEGER,
    diferencia          INTEGER GENERATED ALWAYS AS (COALESCE(stock_contado, 0) - stock_sistema) STORED,
    estado              VARCHAR(30) DEFAULT 'pendiente',
    fecha_conteo        TIMESTAMPTZ,
    "usuarioContadorId" UUID REFERENCES usuarios(id),
    observaciones       TEXT
);

-- Ajustes manuales de inventario
CREATE TABLE ajustes_inventario (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    "sedeId"            UUID NOT NULL REFERENCES sedes(id),
    "conteoId"          UUID REFERENCES conteos_inventario(id),
    tipo_ajuste         tipo_ajuste NOT NULL,
    cantidad            INTEGER NOT NULL,
    stock_antes         INTEGER NOT NULL,
    stock_despues       INTEGER NOT NULL,
    motivo              TEXT NOT NULL,
    aprobado            BOOLEAN DEFAULT FALSE,
    "usuarioCreadorId"  UUID NOT NULL REFERENCES usuarios(id),
    "usuarioApruebаId"  UUID REFERENCES usuarios(id),
    fecha_aprobacion    TIMESTAMPTZ,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2.6 AUDITORÍA Y TRAZABILIDAD
-- -----------------------------------------------------------------------------
CREATE TABLE auditoria_sistema (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuarioId"     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tabla_afectada  VARCHAR(100) NOT NULL,
    tipo_evento     tipo_evento_auditoria NOT NULL,
    registro_id     UUID,
    datos_antes     JSONB,
    datos_despues   JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tabla ON auditoria_sistema(tabla_afectada);
CREATE INDEX idx_auditoria_usuario ON auditoria_sistema("usuarioId");
CREATE INDEX idx_auditoria_fecha ON auditoria_sistema("createdAt");

COMMENT ON TABLE auditoria_sistema IS 'Log completo de cambios para cumplimiento DIAN y seguridad.';

-- Sesiones de usuario
CREATE TABLE sesiones_usuario (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuarioId"     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) UNIQUE NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    activa          BOOLEAN DEFAULT TRUE,
    expira_en       TIMESTAMPTZ NOT NULL,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sesiones_token ON sesiones_usuario(token_hash);

-- Log de sync con Supabase/Cloud
CREATE TABLE sync_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla           VARCHAR(100) NOT NULL,
    operacion       VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    registro_id     UUID NOT NULL,
    payload         JSONB,
    estado          estado_sync NOT NULL DEFAULT 'PENDIENTE',
    intentos        INTEGER DEFAULT 0,
    error_msg       TEXT,
    sincronizado_en TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_estado ON sync_logs(estado);

-- =============================================================================
-- ███████╗ █████╗ ███████╗███████╗    ██████╗
-- ██╔════╝██╔══██╗██╔════╝██╔════╝    ╚════██╗
-- █████╗  ███████║███████╗█████╗       █████╔╝
-- ██╔══╝  ██╔══██║╚════██║██╔══╝       ╚═══██╗
-- ██║     ██║  ██║███████║███████╗    ██████╔╝
-- ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═════╝
-- FASE 3: COMERCIAL Y ANALYTICS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 PROMOCIONES
-- -----------------------------------------------------------------------------
CREATE TABLE promociones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    tipo                tipo_promocion NOT NULL,
    valor               DECIMAL(10,2) NOT NULL,  -- % o monto fijo
    fecha_inicio        TIMESTAMPTZ NOT NULL,
    fecha_fin           TIMESTAMPTZ NOT NULL,
    estado              estado_promocion NOT NULL DEFAULT 'PROGRAMADA',
    aplica_a            VARCHAR(50) NOT NULL DEFAULT 'producto',  -- 'producto', 'categoria', 'marca', 'cliente_nivel'
    minimo_compra       DECIMAL(12,2) DEFAULT 0,
    max_usos            INTEGER,
    usos_actuales       INTEGER DEFAULT 0,
    activa              BOOLEAN DEFAULT TRUE,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Qué productos/categorías/marcas aplican a la promoción
CREATE TABLE promocion_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "promocionId"   UUID NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    tipo_item       VARCHAR(30) NOT NULL,  -- 'variante', 'producto', 'categoria', 'marca'
    item_id         UUID NOT NULL,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Qué niveles de cliente aplican a la promoción
CREATE TABLE promocion_niveles (
    "promocionId"   UUID NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    nivel           nivel_cliente NOT NULL,
    PRIMARY KEY ("promocionId", nivel)
);

-- -----------------------------------------------------------------------------
-- 3.2 COTIZACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE cotizaciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_cotizacion   VARCHAR(40) UNIQUE NOT NULL,  -- COT-2026-00001
    "clienteId"         UUID NOT NULL REFERENCES clientes(id),
    "usuarioId"         UUID NOT NULL REFERENCES usuarios(id),
    "sedeId"            UUID NOT NULL REFERENCES sedes(id),
    fecha_cotizacion    DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE NOT NULL,
    subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento           DECIMAL(12,2) DEFAULT 0,
    impuesto            DECIMAL(12,2) NOT NULL DEFAULT 0,
    total               DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado              estado_cotizacion NOT NULL DEFAULT 'PENDIENTE',
    condiciones         TEXT,
    observaciones       TEXT,
    "ventaGeneradaId"   UUID REFERENCES ventas(id),
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cotizacion_detalles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cotizacionId"      UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
    "varianteId"        UUID NOT NULL REFERENCES variantes(id),
    "productoId"        UUID NOT NULL REFERENCES productos(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     DECIMAL(12,2) NOT NULL,
    descuento           DECIMAL(12,2) DEFAULT 0,
    subtotal            DECIMAL(12,2) NOT NULL,
    observaciones       TEXT
);

CREATE SEQUENCE seq_cotizaciones_num START WITH 1 INCREMENT BY 1;

-- Agregar FK de ventas -> cotizaciones (después de crear ambas tablas)
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_cotizacion
    FOREIGN KEY ("cotizacionId") REFERENCES cotizaciones(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3.3 NOTIFICACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE notificaciones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            tipo_notificacion NOT NULL,
    titulo          VARCHAR(200) NOT NULL,
    mensaje         TEXT NOT NULL,
    "usuarioId"     UUID REFERENCES usuarios(id) ON DELETE CASCADE,  -- NULL = todas
    "sedeId"        UUID REFERENCES sedes(id),
    leida           BOOLEAN DEFAULT FALSE,
    "referenciaId"  UUID,
    tipo_referencia VARCHAR(50),
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_usuario ON notificaciones("usuarioId");
CREATE INDEX idx_notif_leida ON notificaciones(leida);

-- -----------------------------------------------------------------------------
-- 3.4 CACHÉ DE REPORTES (para KPIs rápidos en Dashboard)
-- -----------------------------------------------------------------------------
CREATE TABLE reporte_ventas_diarias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha           DATE NOT NULL,
    "sedeId"        UUID NOT NULL REFERENCES sedes(id),
    total_ventas    DECIMAL(14,2) NOT NULL DEFAULT 0,
    num_transacc    INTEGER NOT NULL DEFAULT 0,
    ticket_promedio DECIMAL(12,2),
    total_devoluc   DECIMAL(12,2) DEFAULT 0,
    total_descuento DECIMAL(12,2) DEFAULT 0,
    margen_bruto    DECIMAL(12,2) DEFAULT 0,
    UNIQUE(fecha, "sedeId")
);

COMment ON TABLE reporte_ventas_diarias IS 'Cache diario para KPIs del Dashboard. Se recalcula con job nocturno.';

-- =============================================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- F1: Función para generar números de documento consecutivos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generar_numero_doc(prefijo TEXT, seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
    num BIGINT;
    year_str TEXT;
BEGIN
    num := nextval(seq_name);
    year_str := TO_CHAR(NOW(), 'YYYY');
    RETURN prefijo || '-' || year_str || '-' || LPAD(num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- F2: Actualizar stock al completar una venta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_sedeId UUID;
    v_stock_ant INTEGER;
BEGIN
    -- Solo actuar en INSERT de detalle_ventas cuando la venta está COMPLETADA
    SELECT v."sedeId" INTO v_sedeId
    FROM ventas v WHERE v.id = NEW."ventaId";

    -- Obtener stock anterior
    SELECT cantidad INTO v_stock_ant
    FROM stock_sedes
    WHERE "varianteId" = NEW."varianteId" AND "sedeId" = v_sedeId;

    -- Reducir stock
    UPDATE stock_sedes
    SET cantidad = cantidad - NEW.cantidad,
        ultima_actualizacion = NOW()
    WHERE "varianteId" = NEW."varianteId" AND "sedeId" = v_sedeId;

    -- Registrar movimiento
    INSERT INTO movimientos_inventario (
        numero_doc, tipo, "varianteId", "productoId",
        "sedeOrigenId", cantidad, stock_anterior, stock_nuevo,
        costo_unitario, motivo, "referenciaId", tipo_referencia, "usuarioId"
    )
    SELECT
        generar_numero_doc('MOV', 'seq_movimientos_num'),
        'SALIDA',
        NEW."varianteId",
        NEW."productoId",
        v_sedeId,
        NEW.cantidad,
        COALESCE(v_stock_ant, 0),
        COALESCE(v_stock_ant, 0) - NEW.cantidad,
        NEW.precio_costo_snap,
        'Venta POS',
        NEW."ventaId",
        'venta',
        v."usuarioId"
    FROM ventas v WHERE v.id = NEW."ventaId";

    -- Generar alerta si stock bajo
    IF (COALESCE(v_stock_ant, 0) - NEW.cantidad) <=
       (SELECT stock_minimo FROM stock_sedes WHERE "varianteId" = NEW."varianteId" AND "sedeId" = v_sedeId)
    THEN
        INSERT INTO notificaciones (tipo, titulo, mensaje, "sedeId", "referenciaId", tipo_referencia)
        SELECT
            'STOCK_BAJO',
            'Stock bajo: ' || p.nombre || ' - ' || var.nombre,
            'El stock de ' || var.nombre || ' en la sede ha llegado al mínimo.',
            v_sedeId,
            NEW."varianteId",
            'variante'
        FROM variantes var
        JOIN productos p ON p.id = var."productoId"
        WHERE var.id = NEW."varianteId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_stock_venta();

-- -----------------------------------------------------------------------------
-- F3: Actualizar nivel de fidelidad del cliente tras venta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_fidelidad_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_id UUID;
    v_puntos_nuevos INTEGER;
    v_nuevo_nivel nivel_cliente;
BEGIN
    -- Solo ventas COMPLETADAS
    IF NEW.estado = 'COMPLETADA' AND NEW."clienteId" IS NOT NULL THEN
        -- Puntos = 1 punto por cada 1000 COP (ajustable)
        v_puntos_nuevos := FLOOR(NEW.total / 1000);

        UPDATE clientes
        SET
            puntos_fidelidad = puntos_fidelidad + v_puntos_nuevos,
            total_compras_hist = total_compras_hist + NEW.total,
            num_compras = num_compras + 1,
            ultima_compra = NOW()
        WHERE id = NEW."clienteId";

        -- Recalcular nivel
        SELECT
            CASE
                WHEN total_compras_hist >= 10000000 THEN 'VIP'
                WHEN total_compras_hist >= 2000000  THEN 'ORO'
                WHEN total_compras_hist >= 500000   THEN 'PLATA'
                ELSE 'BRONCE'
            END::nivel_cliente
        INTO v_nuevo_nivel
        FROM clientes
        WHERE id = NEW."clienteId";

        UPDATE clientes
        SET nivel_fidelidad = v_nuevo_nivel
        WHERE id = NEW."clienteId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fidelidad_cliente
    AFTER INSERT OR UPDATE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fidelidad_cliente();

-- -----------------------------------------------------------------------------
-- F4: Actualizar stock cuando llega una compra a proveedor
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_stock_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_sedeId UUID;
    v_stock_ant INTEGER;
BEGIN
    SELECT "sedeId" INTO v_sedeId FROM compras WHERE id = NEW."compraId";

    SELECT cantidad INTO v_stock_ant
    FROM stock_sedes
    WHERE "varianteId" = NEW."varianteId" AND "sedeId" = v_sedeId;

    -- Insertar o actualizar stock
    INSERT INTO stock_sedes ("varianteId", "sedeId", cantidad)
    VALUES (NEW."varianteId", v_sedeId, NEW.cantidad)
    ON CONFLICT ("varianteId", "sedeId")
    DO UPDATE SET
        cantidad = stock_sedes.cantidad + NEW.cantidad,
        ultima_actualizacion = NOW();

    -- Registrar movimiento
    INSERT INTO movimientos_inventario (
        numero_doc, tipo, "varianteId", "productoId",
        "sedeDestinoId", cantidad,
        stock_anterior, stock_nuevo,
        costo_unitario, motivo,
        "referenciaId", tipo_referencia, "usuarioId"
    )
    SELECT
        generar_numero_doc('MOV', 'seq_movimientos_num'),
        'COMPRA',
        NEW."varianteId",
        NEW."productoId",
        v_sedeId,
        NEW.cantidad,
        COALESCE(v_stock_ant, 0),
        COALESCE(v_stock_ant, 0) + NEW.cantidad,
        NEW.precio_unitario,
        'Compra a proveedor',
        NEW."compraId",
        'compra',
        c."usuarioId"
    FROM compras c WHERE c.id = NEW."compraId";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_compra
    AFTER INSERT ON compra_detalles
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_stock_compra();

-- -----------------------------------------------------------------------------
-- F5: Actualizar saldo de compra cuando se agrega un abono
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_saldo_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL(14,2);
    v_abonado DECIMAL(14,2);
BEGIN
    UPDATE compras
    SET total_abonado = total_abonado + NEW.monto,
        saldo_pendiente = saldo_pendiente - NEW.monto,
        estado_pago = CASE
            WHEN (saldo_pendiente - NEW.monto) <= 0 THEN 'COMPLETADO'
            WHEN (total_abonado + NEW.monto) > 0    THEN 'PARCIAL'
            ELSE 'PENDIENTE'
        END,
        "updatedAt" = NOW()
    WHERE id = NEW."compraId";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_saldo_abono
    AFTER INSERT ON abonos_compra
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_saldo_compra();

-- -----------------------------------------------------------------------------
-- F6: Reingreso de stock al aprobar una devolución
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reingreso_stock_devolucion()
RETURNS TRIGGER AS $$
DECLARE
    v_sedeId UUID;
    v_stock_ant INTEGER;
BEGIN
    -- Solo reingresar si acción = REINGRESO_INVENTARIO
    IF NEW.accion = 'REINGRESO_INVENTARIO' THEN
        SELECT v."sedeId" INTO v_sedeId
        FROM devoluciones d
        JOIN ventas v ON v.id = d."ventaId"
        WHERE d.id = NEW."devolucionId";

        SELECT cantidad INTO v_stock_ant
        FROM stock_sedes
        WHERE "varianteId" = NEW."varianteId" AND "sedeId" = v_sedeId;

        INSERT INTO stock_sedes ("varianteId", "sedeId", cantidad)
        VALUES (NEW."varianteId", v_sedeId, NEW.cantidad_devuelta)
        ON CONFLICT ("varianteId", "sedeId")
        DO UPDATE SET
            cantidad = stock_sedes.cantidad + NEW.cantidad_devuelta,
            ultima_actualizacion = NOW();

        INSERT INTO movimientos_inventario (
            numero_doc, tipo, "varianteId", "productoId",
            "sedeDestinoId", cantidad,
            stock_anterior, stock_nuevo,
            motivo, "referenciaId", tipo_referencia, "usuarioId"
        )
        SELECT
            generar_numero_doc('MOV', 'seq_movimientos_num'),
            'DEVOLUCION',
            NEW."varianteId",
            NEW."productoId",
            v_sedeId,
            NEW.cantidad_devuelta,
            COALESCE(v_stock_ant, 0),
            COALESCE(v_stock_ant, 0) + NEW.cantidad_devuelta,
            'Reingreso por devolución',
            NEW."devolucionId",
            'devolucion',
            d."usuarioProcesaId"
        FROM devoluciones d WHERE d.id = NEW."devolucionId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_devolucion
    AFTER INSERT ON devolucion_detalles
    FOR EACH ROW
    EXECUTE FUNCTION fn_reingreso_stock_devolucion();

-- -----------------------------------------------------------------------------
-- F7: updatedAt automático en todas las tablas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updatedAt
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'sedes','usuarios','categorias','marcas','proveedores','productos',
        'variantes','clientes','cajas','sesiones_caja','ventas',
        'compras','devoluciones','traspasos','conteos_inventario',
        'promociones','cotizaciones'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- =============================================================================
-- VISTAS ÚTILES PARA EL BACKEND
-- =============================================================================

-- Vista: productos con stock total agregado
CREATE OR REPLACE VIEW v_productos_stock AS
SELECT
    p.id AS "productoId",
    p.nombre,
    p.codigo_interno,
    c.nombre AS categoria,
    m.nombre AS marca,
    p.precio_venta,
    p.precio_costo,
    ROUND(((p.precio_venta - p.precio_costo) / NULLIF(p.precio_venta, 0)) * 100, 2) AS margen_pct,
    COUNT(DISTINCT v.id) AS num_variantes,
    SUM(ss.cantidad) AS stock_total,
    p.activo
FROM productos p
LEFT JOIN categorias c ON c.id = p."categoriaId"
LEFT JOIN marcas m ON m.id = p."marcaId"
LEFT JOIN variantes v ON v."productoId" = p.id AND v.activa = TRUE
LEFT JOIN stock_sedes ss ON ss."varianteId" = v.id
GROUP BY p.id, p.nombre, p.codigo_interno, c.nombre, m.nombre,
         p.precio_venta, p.precio_costo, p.activo;

-- Vista: alertas de stock bajo por sede
CREATE OR REPLACE VIEW v_alertas_stock AS
SELECT
    ss."sedeId",
    s.nombre AS sede,
    v.id AS "varianteId",
    v.nombre AS variante,
    p.nombre AS producto,
    ss.cantidad AS stock_actual,
    ss.stock_minimo,
    (ss.stock_minimo - ss.cantidad) AS unidades_faltantes
FROM stock_sedes ss
JOIN sedes s ON s.id = ss."sedeId"
JOIN variantes v ON v.id = ss."varianteId"
JOIN productos p ON p.id = v."productoId"
WHERE ss.cantidad <= ss.stock_minimo
  AND v.activa = TRUE
  AND p.activo = TRUE
ORDER BY unidades_faltantes DESC;

-- Vista: KPIs ventas del día por sede (para Dashboard)
CREATE OR REPLACE VIEW v_ventas_hoy AS
SELECT
    v."sedeId",
    s.nombre AS sede,
    COUNT(*) AS num_ventas,
    SUM(v.total) AS total_ventas,
    ROUND(AVG(v.total), 2) AS ticket_promedio,
    SUM(v.descuento_total) AS total_descuentos,
    COUNT(DISTINCT v."clienteId") AS clientes_atendidos
FROM ventas v
JOIN sedes s ON s.id = v."sedeId"
WHERE DATE(v."createdAt" AT TIME ZONE 'America/Bogota') = CURRENT_DATE
  AND v.estado = 'COMPLETADA'
GROUP BY v."sedeId", s.nombre;

-- Vista: detalle rentabilidad por venta
CREATE OR REPLACE VIEW v_rentabilidad_ventas AS
SELECT
    v.id AS "ventaId",
    v.numero,
    v."createdAt",
    s.nombre AS sede,
    v.total,
    SUM(dv.precio_costo_snap * dv.cantidad) AS costo_total,
    v.total - SUM(dv.precio_costo_snap * dv.cantidad) AS ganancia_bruta,
    ROUND((
        (v.total - SUM(dv.precio_costo_snap * dv.cantidad)) /
        NULLIF(v.total, 0)
    ) * 100, 2) AS margen_pct
FROM ventas v
JOIN sedes s ON s.id = v."sedeId"
JOIN detalle_ventas dv ON dv."ventaId" = v.id
WHERE v.estado = 'COMPLETADA'
GROUP BY v.id, v.numero, v."createdAt", s.nombre, v.total;

-- Vista: clientes con fidelidad y próximo nivel
CREATE OR REPLACE VIEW v_clientes_fidelidad AS
SELECT
    c.id,
    c.nombre || ' ' || COALESCE(c.apellido,'') AS nombre_completo,
    c.documento,
    c.telefono,
    c.email,
    c.nivel_fidelidad,
    c.puntos_fidelidad,
    c.total_compras_hist,
    c.num_compras,
    c.ultima_compra,
    rf_next.monto_minimo_acum - c.total_compras_hist AS falta_para_siguiente_nivel
FROM clientes c
LEFT JOIN reglas_fidelidad rf_next ON (
    rf_next.nivel = CASE c.nivel_fidelidad
        WHEN 'BRONCE' THEN 'PLATA'
        WHEN 'PLATA'  THEN 'ORO'
        WHEN 'ORO'    THEN 'VIP'
        ELSE NULL
    END
)
WHERE c.activo = TRUE;

-- =============================================================================
-- ÍNDICES DE RENDIMIENTO
-- =============================================================================

CREATE INDEX idx_ventas_sede_fecha ON ventas("sedeId", "createdAt");
CREATE INDEX idx_ventas_cliente ON ventas("clienteId");
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas("ventaId");
CREATE INDEX idx_detalle_ventas_variante ON detalle_ventas("varianteId");
CREATE INDEX idx_stock_variante_sede ON stock_sedes("varianteId", "sedeId");
CREATE INDEX idx_clientes_documento ON clientes(documento);
CREATE INDEX idx_clientes_nombre ON clientes(nombre, apellido);
CREATE INDEX idx_variantes_sku ON variantes(sku);
CREATE INDEX idx_variantes_barras ON variantes(codigo_barras);
CREATE INDEX idx_productos_codigo ON productos(codigo_interno);
CREATE INDEX idx_compras_proveedor ON compras("proveedorId");
CREATE INDEX idx_sesiones_caja_activa ON sesiones_caja(activa);

-- =============================================================================
-- DATOS SEMILLA INICIALES (SEED)
-- =============================================================================

-- Sede principal
INSERT INTO sedes (codigo, nombre, ciudad, tipo, activa) VALUES
    ('PRINCIPAL', 'Integral Cosméticos - Principal', 'Cali', 'PRINCIPAL', TRUE),
    ('BODEGA-001', 'Bodega Central', 'Cali', 'BODEGA', TRUE);

-- Categorías
INSERT INTO categorias (nombre, descripcion, orden) VALUES
    ('Maquillaje', 'Bases, labiales, sombras, rubores', 1),
    ('Skincare', 'Hidratantes, serums, limpiadoras, protectores solares', 2),
    ('Cabello', 'Shampoos, acondicionadores, tratamientos capilares', 3),
    ('Fragancias', 'Perfumes, colonias, body mist', 4),
    ('Cuerpo', 'Cremas corporales, exfoliantes, desodorantes', 5),
    ('Uñas', 'Esmaltes, removedores, tratamientos de uñas', 6),
    ('Herramientas', 'Brochas, esponjas, rizadores, planchas', 7);

-- Subcategorías ejemplo
INSERT INTO categorias (nombre, descripcion, orden, "categoriaPadreId") VALUES
    ('Labios', 'Labiales, gloss, delineadores labiales', 1,
        (SELECT id FROM categorias WHERE nombre = 'Maquillaje')),
    ('Ojos', 'Sombras, delineadores, máscaras', 2,
        (SELECT id FROM categorias WHERE nombre = 'Maquillaje')),
    ('Rostro', 'Bases, correctores, rubores, iluminadores', 3,
        (SELECT id FROM categorias WHERE nombre = 'Maquillaje'));

-- Tipos de gasto
INSERT INTO tipos_gasto (nombre, descripcion, requiere_autorizacion, monto_maximo) VALUES
    ('Papelería', 'Compra de útiles de oficina y papelería', FALSE, 50000),
    ('Aseo', 'Productos de limpieza y aseo', FALSE, 80000),
    ('Mensajería', 'Envíos y domicilios', FALSE, 30000),
    ('Reparación menor', 'Arreglos pequeños en el local', TRUE, 200000),
    ('Transporte', 'Taxis, Uber para diligencias del negocio', FALSE, 50000),
    ('Otros', 'Gastos varios no categorizados', TRUE, 100000);

-- Atributos de variante para cosméticos
INSERT INTO atributos (nombre, tipo) VALUES
    ('Tono', 'color'),
    ('Presentación', 'texto'),
    ('Volumen', 'texto'),
    ('Acabado', 'texto'),
    ('Línea', 'texto');

COMMIT;

-- =============================================================================
-- FIN DEL SCHEMA
-- Tablas totales: ~45
-- Triggers: 8
-- Funciones: 7
-- Vistas: 5
-- Índices: 15
-- =============================================================================
