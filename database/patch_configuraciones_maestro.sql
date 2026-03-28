BEGIN;

CREATE TABLE IF NOT EXISTS tipos_documento_configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parametros_configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave VARCHAR(120) NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT,
  tipo_dato VARCHAR(20) NOT NULL DEFAULT 'STRING',
  modulo VARCHAR(60),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tipos_documento_configuracion (codigo, nombre, descripcion, activo)
VALUES
  ('CC', 'Cedula de Ciudadania', 'Documento nacional de identidad', TRUE),
  ('NIT', 'Numero de Identificacion Tributaria', 'Documento para empresas y personas juridicas', TRUE),
  ('CE', 'Cedula de Extranjeria', 'Documento para extranjeros residentes', TRUE),
  ('PP', 'Pasaporte', 'Documento internacional de viaje', TRUE)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

INSERT INTO parametros_configuracion (clave, valor, descripcion, tipo_dato, modulo, activo)
VALUES
  ('empresa.nombre_comercial', 'Integral Cosmeticos', 'Nombre comercial mostrado en tickets y reportes', 'STRING', 'empresa', TRUE),
  ('empresa.nit', '900000000-0', 'NIT de la empresa para documentos comerciales', 'STRING', 'empresa', TRUE),
  ('venta.moneda', 'COP', 'Codigo ISO de moneda para operaciones de venta', 'STRING', 'ventas', TRUE),
  ('venta.iva_defecto', '19', 'Porcentaje de IVA por defecto en productos nuevos', 'NUMBER', 'ventas', TRUE),
  ('venta.permitir_descuento_libre', 'true', 'Permite al cajero ingresar descuentos manuales', 'BOOLEAN', 'ventas', TRUE),
  ('venta.descuento_maximo_porcentaje', '25', 'Limite maximo de descuento permitido en porcentaje', 'NUMBER', 'ventas', TRUE),
  ('ticket.prefijo_venta', 'VTA', 'Prefijo usado en consecutivo de ventas', 'STRING', 'caja', TRUE),
  ('ticket.mostrar_nit_cliente', 'true', 'Controla si el ticket imprime identificacion del cliente', 'BOOLEAN', 'caja', TRUE),
  ('inventario.stock_minimo_defecto', '5', 'Stock minimo por defecto para nuevas variantes', 'NUMBER', 'inventario', TRUE),
  ('inventario.alerta_critica_umbral', '2', 'Umbral para marcar stock en estado critico', 'NUMBER', 'inventario', TRUE),
  ('sync.intervalo_minutos', '5', 'Intervalo base de sincronizacion cloud en minutos', 'NUMBER', 'sync', TRUE),
  ('clientes.puntos_por_cada_1000', '1', 'Puntos de fidelidad entregados por cada 1000 COP vendidos', 'NUMBER', 'clientes', TRUE),
  ('clientes.tipo_documento_defecto', 'CC', 'Tipo de documento preseleccionado en formulario de cliente', 'STRING', 'clientes', TRUE),
  ('importaciones.modo_defecto', 'crear_o_actualizar', 'Modo por defecto para importaciones de catalogo', 'STRING', 'importaciones', TRUE),
  ('reportes.zona_horaria', 'America/Bogota', 'Zona horaria para consolidacion de reportes diarios', 'STRING', 'reportes', TRUE)
ON CONFLICT (clave) DO UPDATE
SET valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    tipo_dato = EXCLUDED.tipo_dato,
    modulo = EXCLUDED.modulo,
    activo = EXCLUDED.activo;

COMMIT;
