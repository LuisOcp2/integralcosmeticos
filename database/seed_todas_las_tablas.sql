BEGIN;

INSERT INTO sedes (id, codigo, nombre, ciudad, tipo, activa)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'QA-SEDE-001', 'Sede QA Principal', 'Cali', 'PRINCIPAL', TRUE),
  ('00000000-0000-0000-0000-000000000102', 'QA-SEDE-002', 'Sede QA Bodega', 'Cali', 'BODEGA', TRUE)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    ciudad = EXCLUDED.ciudad,
    tipo = EXCLUDED.tipo,
    activa = EXCLUDED.activa;

INSERT INTO categorias (id, nombre, descripcion, orden, activa)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'QA Categoria General', 'Categoria para pruebas integrales', 999, TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    activa = EXCLUDED.activa;

INSERT INTO marcas (id, nombre, descripcion, activa)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'QA Marca', 'Marca de prueba', TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activa = EXCLUDED.activa;

INSERT INTO tipos_documento_configuracion (id, codigo, nombre, descripcion, activo)
VALUES
  ('00000000-0000-0000-0000-00000000c101', 'CC', 'Cedula de Ciudadania', 'Documento nacional de identidad', TRUE),
  ('00000000-0000-0000-0000-00000000c102', 'NIT', 'Numero de Identificacion Tributaria', 'Documento para empresas y personas juridicas', TRUE),
  ('00000000-0000-0000-0000-00000000c103', 'CE', 'Cedula de Extranjeria', 'Documento para extranjeros residentes', TRUE),
  ('00000000-0000-0000-0000-00000000c104', 'PP', 'Pasaporte', 'Documento internacional de viaje', TRUE)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

INSERT INTO parametros_configuracion (id, clave, valor, descripcion, tipo_dato, modulo, activo)
VALUES
  ('00000000-0000-0000-0000-00000000c201', 'empresa.nombre_comercial', 'Integral Cosmeticos', 'Nombre comercial mostrado en tickets y reportes', 'STRING', 'empresa', TRUE),
  ('00000000-0000-0000-0000-00000000c202', 'empresa.nit', '900000000-0', 'NIT de la empresa para documentos comerciales', 'STRING', 'empresa', TRUE),
  ('00000000-0000-0000-0000-00000000c203', 'venta.moneda', 'COP', 'Codigo ISO de moneda para operaciones de venta', 'STRING', 'ventas', TRUE),
  ('00000000-0000-0000-0000-00000000c204', 'venta.iva_defecto', '19', 'Porcentaje de IVA por defecto en productos nuevos', 'NUMBER', 'ventas', TRUE),
  ('00000000-0000-0000-0000-00000000c205', 'venta.permitir_descuento_libre', 'true', 'Permite al cajero ingresar descuentos manuales', 'BOOLEAN', 'ventas', TRUE),
  ('00000000-0000-0000-0000-00000000c206', 'venta.descuento_maximo_porcentaje', '25', 'Limite maximo de descuento permitido en porcentaje', 'NUMBER', 'ventas', TRUE),
  ('00000000-0000-0000-0000-00000000c207', 'ticket.prefijo_venta', 'VTA', 'Prefijo usado en consecutivo de ventas', 'STRING', 'caja', TRUE),
  ('00000000-0000-0000-0000-00000000c208', 'ticket.mostrar_nit_cliente', 'true', 'Controla si el ticket imprime identificacion del cliente', 'BOOLEAN', 'caja', TRUE),
  ('00000000-0000-0000-0000-00000000c209', 'inventario.stock_minimo_defecto', '5', 'Stock minimo por defecto para nuevas variantes', 'NUMBER', 'inventario', TRUE),
  ('00000000-0000-0000-0000-00000000c210', 'inventario.alerta_critica_umbral', '2', 'Umbral para marcar stock en estado critico', 'NUMBER', 'inventario', TRUE),
  ('00000000-0000-0000-0000-00000000c211', 'sync.intervalo_minutos', '5', 'Intervalo base de sincronizacion cloud en minutos', 'NUMBER', 'sync', TRUE),
  ('00000000-0000-0000-0000-00000000c212', 'clientes.puntos_por_cada_1000', '1', 'Puntos de fidelidad entregados por cada 1000 COP vendidos', 'NUMBER', 'clientes', TRUE),
  ('00000000-0000-0000-0000-00000000c213', 'clientes.tipo_documento_defecto', 'CC', 'Tipo de documento preseleccionado en formulario de cliente', 'STRING', 'clientes', TRUE),
  ('00000000-0000-0000-0000-00000000c214', 'importaciones.modo_defecto', 'crear_o_actualizar', 'Modo por defecto para importaciones de catalogo', 'STRING', 'importaciones', TRUE),
  ('00000000-0000-0000-0000-00000000c215', 'reportes.zona_horaria', 'America/Bogota', 'Zona horaria para consolidacion de reportes diarios', 'STRING', 'reportes', TRUE)
ON CONFLICT (id) DO UPDATE
SET clave = EXCLUDED.clave,
    valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    tipo_dato = EXCLUDED.tipo_dato,
    modulo = EXCLUDED.modulo,
    activo = EXCLUDED.activo;

INSERT INTO proveedores (id, codigo, razon_social, nombre_comercial, nit, email, telefono, ciudad, activo)
VALUES
  ('00000000-0000-0000-0000-000000000601', 'QA-PROV-001', 'Proveedor QA SAS', 'Proveedor QA', '900000001-1', 'proveedor.qa@integral.local', '3000000001', 'Cali', TRUE)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    razon_social = EXCLUDED.razon_social,
    nombre_comercial = EXCLUDED.nombre_comercial,
    nit = EXCLUDED.nit,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono,
    ciudad = EXCLUDED.ciudad,
    activo = EXCLUDED.activo;

INSERT INTO tipos_gasto (id, nombre, descripcion, requiere_autorizacion, monto_maximo)
VALUES
  ('00000000-0000-0000-0000-000000000602', 'QA Gasto', 'Gasto de prueba', FALSE, 100000)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    requiere_autorizacion = EXCLUDED.requiere_autorizacion,
    monto_maximo = EXCLUDED.monto_maximo;

INSERT INTO atributos (id, nombre, tipo, activo)
VALUES
  ('00000000-0000-0000-0000-000000000603', 'QA Tono', 'color', TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    activo = EXCLUDED.activo;

INSERT INTO atributo_valores (id, "atributoId", valor, codigo_hex, orden, activo)
VALUES
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000603', 'QA Rojo', '#FF2A2A', 1, TRUE)
ON CONFLICT (id) DO UPDATE
SET "atributoId" = EXCLUDED."atributoId",
    valor = EXCLUDED.valor,
    codigo_hex = EXCLUDED.codigo_hex,
    orden = EXCLUDED.orden,
    activo = EXCLUDED.activo;

INSERT INTO reglas_fidelidad (id, nivel, monto_minimo_acum, porcentaje_puntos, descuento_auto, activa)
VALUES
  ('00000000-0000-0000-0000-000000001a01', 'BRONCE', 0, 1.0, 0, TRUE)
ON CONFLICT (nivel) DO UPDATE
SET monto_minimo_acum = EXCLUDED.monto_minimo_acum,
    porcentaje_puntos = EXCLUDED.porcentaje_puntos,
    descuento_auto = EXCLUDED.descuento_auto,
    activa = EXCLUDED.activa;

INSERT INTO usuarios (id, nombre, apellido, email, password, rol, "sedeId", activo)
VALUES
  ('00000000-0000-0000-0000-000000000201', 'Admin', 'QA', 'admin.qa@integral.local', '$2a$10$NYHVz0f5VbbDB.xW4VOrueWTa2/xXhjAvYQeTrcFR8f0TEPw8x4T6', 'ADMIN', '00000000-0000-0000-0000-000000000101', TRUE),
  ('00000000-0000-0000-0000-000000000202', 'Cajero', 'QA', 'cajero.qa@integral.local', '$2a$10$NYHVz0f5VbbDB.xW4VOrueWTa2/xXhjAvYQeTrcFR8f0TEPw8x4T6', 'CAJERO', '00000000-0000-0000-0000-000000000101', TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    rol = EXCLUDED.rol,
    "sedeId" = EXCLUDED."sedeId",
    activo = EXCLUDED.activo;

INSERT INTO sesiones_usuario (id, "usuarioId", token_hash, ip_address, user_agent, expira_en, activa)
VALUES
  ('00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000000201', 'qa-token-hash-001', '127.0.0.1', 'seed-script', NOW() + INTERVAL '7 day', TRUE)
ON CONFLICT (id) DO UPDATE
SET "usuarioId" = EXCLUDED."usuarioId",
    token_hash = EXCLUDED.token_hash,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    expira_en = EXCLUDED.expira_en,
    activa = EXCLUDED.activa;

INSERT INTO cajas (id, codigo, nombre, "sedeId", activa)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'QA-CAJA-001', 'Caja QA', '00000000-0000-0000-0000-000000000101', TRUE)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    "sedeId" = EXCLUDED."sedeId",
    activa = EXCLUDED.activa;

INSERT INTO sesiones_caja (id, "cajaId", "usuarioAperturaId", fecha_apertura, monto_inicial, activa)
VALUES
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '1 hour', 200000, TRUE)
ON CONFLICT (id) DO UPDATE
SET "cajaId" = EXCLUDED."cajaId",
    "usuarioAperturaId" = EXCLUDED."usuarioAperturaId",
    fecha_apertura = EXCLUDED.fecha_apertura,
    monto_inicial = EXCLUDED.monto_inicial,
    activa = EXCLUDED.activa;

INSERT INTO caja_movimientos (id, "sesionCajaId", "usuarioId", tipo, concepto, monto, es_ingreso, tipo_referencia)
VALUES
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'APERTURA', 'Apertura de caja QA', 200000, TRUE, 'sesion')
ON CONFLICT (id) DO UPDATE
SET "sesionCajaId" = EXCLUDED."sesionCajaId",
    "usuarioId" = EXCLUDED."usuarioId",
    tipo = EXCLUDED.tipo,
    concepto = EXCLUDED.concepto,
    monto = EXCLUDED.monto,
    es_ingreso = EXCLUDED.es_ingreso,
    tipo_referencia = EXCLUDED.tipo_referencia;

INSERT INTO productos (id, nombre, descripcion, codigo_interno, "categoriaId", "marcaId", "proveedorId", precio_venta, precio_costo, impuesto, activo)
VALUES
  ('00000000-0000-0000-0000-000000000701', 'Labial QA Mate', 'Producto de prueba QA', 'QA-PROD-001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000601', 25000, 12000, 19, TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    codigo_interno = EXCLUDED.codigo_interno,
    "categoriaId" = EXCLUDED."categoriaId",
    "marcaId" = EXCLUDED."marcaId",
    "proveedorId" = EXCLUDED."proveedorId",
    precio_venta = EXCLUDED.precio_venta,
    precio_costo = EXCLUDED.precio_costo,
    impuesto = EXCLUDED.impuesto,
    activo = EXCLUDED.activo;

INSERT INTO variantes (id, "productoId", nombre, sku, codigo_barras, precio_extra, precio_venta, precio_costo, activa)
VALUES
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 'Tono QA Rojo', 'QA-SKU-001', '7700000000001', 0, 25000, 12000, TRUE)
ON CONFLICT (id) DO UPDATE
SET "productoId" = EXCLUDED."productoId",
    nombre = EXCLUDED.nombre,
    sku = EXCLUDED.sku,
    codigo_barras = EXCLUDED.codigo_barras,
    precio_extra = EXCLUDED.precio_extra,
    precio_venta = EXCLUDED.precio_venta,
    precio_costo = EXCLUDED.precio_costo,
    activa = EXCLUDED.activa;

INSERT INTO variante_atributos ("varianteId", "atributoId", "valorId")
VALUES
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000604')
ON CONFLICT ("varianteId", "atributoId") DO UPDATE
SET "valorId" = EXCLUDED."valorId";

INSERT INTO stock_sedes (id, "varianteId", "sedeId", cantidad, stock_minimo)
VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000101', 80, 10)
ON CONFLICT (id) DO UPDATE
SET "varianteId" = EXCLUDED."varianteId",
    "sedeId" = EXCLUDED."sedeId",
    cantidad = EXCLUDED.cantidad,
    stock_minimo = EXCLUDED.stock_minimo;

INSERT INTO movimientos_inventario (id, numero_doc, tipo, "varianteId", "productoId", "sedeOrigenId", "sedeDestinoId", cantidad, stock_anterior, stock_nuevo, costo_unitario, motivo, "usuarioId")
VALUES
  ('00000000-0000-0000-0000-000000001e04', 'QA-MOV-001', 'AJUSTE', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', NULL, '00000000-0000-0000-0000-000000000101', 10, 70, 80, 12000, 'Ajuste inicial QA', '00000000-0000-0000-0000-000000000201')
ON CONFLICT (id) DO UPDATE
SET numero_doc = EXCLUDED.numero_doc,
    tipo = EXCLUDED.tipo,
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    "sedeOrigenId" = EXCLUDED."sedeOrigenId",
    "sedeDestinoId" = EXCLUDED."sedeDestinoId",
    cantidad = EXCLUDED.cantidad,
    stock_anterior = EXCLUDED.stock_anterior,
    stock_nuevo = EXCLUDED.stock_nuevo,
    costo_unitario = EXCLUDED.costo_unitario,
    motivo = EXCLUDED.motivo,
    "usuarioId" = EXCLUDED."usuarioId";

INSERT INTO clientes (id, nombre, apellido, tipo_documento, documento, email, telefono, ciudad, nivel_fidelidad, "sedeId", activo)
VALUES
  ('00000000-0000-0000-0000-000000000a01', 'Cliente', 'QA', 'CC', '1000000001', 'cliente.qa@integral.local', '3000000002', 'Cali', 'BRONCE', '00000000-0000-0000-0000-000000000101', TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    tipo_documento = EXCLUDED.tipo_documento,
    documento = EXCLUDED.documento,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono,
    ciudad = EXCLUDED.ciudad,
    nivel_fidelidad = EXCLUDED.nivel_fidelidad,
    "sedeId" = EXCLUDED."sedeId",
    activo = EXCLUDED.activo;

INSERT INTO cotizaciones (id, numero_cotizacion, "clienteId", "usuarioId", "sedeId", fecha_cotizacion, fecha_vencimiento, subtotal, impuesto, total, estado)
VALUES
  ('00000000-0000-0000-0000-000000000c01', 'QA-COT-001', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 day', 25000, 4750, 29750, 'APROBADA')
ON CONFLICT (id) DO UPDATE
SET numero_cotizacion = EXCLUDED.numero_cotizacion,
    "clienteId" = EXCLUDED."clienteId",
    "usuarioId" = EXCLUDED."usuarioId",
    "sedeId" = EXCLUDED."sedeId",
    fecha_vencimiento = EXCLUDED.fecha_vencimiento,
    subtotal = EXCLUDED.subtotal,
    impuesto = EXCLUDED.impuesto,
    total = EXCLUDED.total,
    estado = EXCLUDED.estado;

INSERT INTO cotizacion_detalles (id, "cotizacionId", "varianteId", "productoId", cantidad, precio_unitario, subtotal)
VALUES
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 1, 25000, 25000)
ON CONFLICT (id) DO UPDATE
SET "cotizacionId" = EXCLUDED."cotizacionId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    cantidad = EXCLUDED.cantidad,
    precio_unitario = EXCLUDED.precio_unitario,
    subtotal = EXCLUDED.subtotal;

INSERT INTO ventas (id, numero, "sedeId", "clienteId", "usuarioId", "sesionCajaId", "cotizacionId", subtotal, descuento_total, impuesto_total, total, metodo_pago, estado)
VALUES
  ('00000000-0000-0000-0000-000000000b01', 'QA-VTA-001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000c01', 25000, 0, 4750, 29750, 'EFECTIVO', 'COMPLETADA')
ON CONFLICT (id) DO UPDATE
SET numero = EXCLUDED.numero,
    "sedeId" = EXCLUDED."sedeId",
    "clienteId" = EXCLUDED."clienteId",
    "usuarioId" = EXCLUDED."usuarioId",
    "sesionCajaId" = EXCLUDED."sesionCajaId",
    "cotizacionId" = EXCLUDED."cotizacionId",
    subtotal = EXCLUDED.subtotal,
    descuento_total = EXCLUDED.descuento_total,
    impuesto_total = EXCLUDED.impuesto_total,
    total = EXCLUDED.total,
    metodo_pago = EXCLUDED.metodo_pago,
    estado = EXCLUDED.estado;

INSERT INTO detalle_ventas (id, "ventaId", "varianteId", "productoId", cantidad, precio_unitario, precio_costo_snap, descuento_item, impuesto_item, subtotal)
VALUES
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 1, 25000, 12000, 0, 4750, 25000)
ON CONFLICT (id) DO UPDATE
SET "ventaId" = EXCLUDED."ventaId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    cantidad = EXCLUDED.cantidad,
    precio_unitario = EXCLUDED.precio_unitario,
    precio_costo_snap = EXCLUDED.precio_costo_snap,
    descuento_item = EXCLUDED.descuento_item,
    impuesto_item = EXCLUDED.impuesto_item,
    subtotal = EXCLUDED.subtotal;

INSERT INTO venta_pagos (id, "ventaId", metodo_pago, monto, referencia)
VALUES
  ('00000000-0000-0000-0000-000000000b03', '00000000-0000-0000-0000-000000000b01', 'EFECTIVO', 29750, 'QA-PAGO-001')
ON CONFLICT (id) DO UPDATE
SET "ventaId" = EXCLUDED."ventaId",
    metodo_pago = EXCLUDED.metodo_pago,
    monto = EXCLUDED.monto,
    referencia = EXCLUDED.referencia;

INSERT INTO compras (id, numero_compra, "proveedorId", "sedeId", "usuarioId", fecha_compra, subtotal, iva, descuento, total, total_abonado, saldo_pendiente, estado, estado_pago)
VALUES
  ('00000000-0000-0000-0000-000000000d01', 'QA-CMP-001', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', CURRENT_DATE, 240000, 45600, 0, 285600, 100000, 185600, 'RECIBIDA', 'PARCIAL')
ON CONFLICT (id) DO UPDATE
SET numero_compra = EXCLUDED.numero_compra,
    "proveedorId" = EXCLUDED."proveedorId",
    "sedeId" = EXCLUDED."sedeId",
    "usuarioId" = EXCLUDED."usuarioId",
    subtotal = EXCLUDED.subtotal,
    iva = EXCLUDED.iva,
    descuento = EXCLUDED.descuento,
    total = EXCLUDED.total,
    total_abonado = EXCLUDED.total_abonado,
    saldo_pendiente = EXCLUDED.saldo_pendiente,
    estado = EXCLUDED.estado,
    estado_pago = EXCLUDED.estado_pago;

INSERT INTO compra_detalles (id, "compraId", "varianteId", "productoId", cantidad, precio_unitario, subtotal, cantidad_recibida)
VALUES
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 20, 12000, 240000, 20)
ON CONFLICT (id) DO UPDATE
SET "compraId" = EXCLUDED."compraId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    cantidad = EXCLUDED.cantidad,
    precio_unitario = EXCLUDED.precio_unitario,
    subtotal = EXCLUDED.subtotal,
    cantidad_recibida = EXCLUDED.cantidad_recibida;

INSERT INTO abonos_compra (id, "compraId", monto, fecha_abono, metodo_pago, "usuarioId", observaciones)
VALUES
  ('00000000-0000-0000-0000-000000000d03', '00000000-0000-0000-0000-000000000d01', 100000, NOW(), 'TRANSFERENCIA', '00000000-0000-0000-0000-000000000201', 'Abono inicial QA')
ON CONFLICT (id) DO UPDATE
SET "compraId" = EXCLUDED."compraId",
    monto = EXCLUDED.monto,
    fecha_abono = EXCLUDED.fecha_abono,
    metodo_pago = EXCLUDED.metodo_pago,
    "usuarioId" = EXCLUDED."usuarioId",
    observaciones = EXCLUDED.observaciones;

INSERT INTO conteos_inventario (id, nombre, "sedeId", "usuarioResponsableId", fecha_programada, estado, observaciones)
VALUES
  ('00000000-0000-0000-0000-000000000e01', 'Conteo QA General', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', NOW(), 'COMPLETADO', 'Conteo de verificacion')
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    "sedeId" = EXCLUDED."sedeId",
    "usuarioResponsableId" = EXCLUDED."usuarioResponsableId",
    fecha_programada = EXCLUDED.fecha_programada,
    estado = EXCLUDED.estado,
    observaciones = EXCLUDED.observaciones;

INSERT INTO conteo_detalles (id, "conteoId", "varianteId", "productoId", stock_sistema, stock_contado, estado, "usuarioContadorId")
VALUES
  ('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 80, 79, 'contado', '00000000-0000-0000-0000-000000000201')
ON CONFLICT (id) DO UPDATE
SET "conteoId" = EXCLUDED."conteoId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    stock_sistema = EXCLUDED.stock_sistema,
    stock_contado = EXCLUDED.stock_contado,
    estado = EXCLUDED.estado,
    "usuarioContadorId" = EXCLUDED."usuarioContadorId";

INSERT INTO ajustes_inventario (id, "varianteId", "productoId", "sedeId", "conteoId", tipo_ajuste, cantidad, stock_antes, stock_despues, motivo, "usuarioCreadorId", aprobado)
VALUES
  ('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000e01', 'INVENTARIO_FISICO', -1, 80, 79, 'Ajuste por conteo QA', '00000000-0000-0000-0000-000000000201', TRUE)
ON CONFLICT (id) DO UPDATE
SET "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    "sedeId" = EXCLUDED."sedeId",
    "conteoId" = EXCLUDED."conteoId",
    tipo_ajuste = EXCLUDED.tipo_ajuste,
    cantidad = EXCLUDED.cantidad,
    stock_antes = EXCLUDED.stock_antes,
    stock_despues = EXCLUDED.stock_despues,
    motivo = EXCLUDED.motivo,
    "usuarioCreadorId" = EXCLUDED."usuarioCreadorId",
    aprobado = EXCLUDED.aprobado;

INSERT INTO traspasos (id, numero_traspaso, "sedeOrigenId", "sedeDestinoId", "usuarioSolicitaId", fecha_solicitud, estado)
VALUES
  ('00000000-0000-0000-0000-000000000f01', 'QA-TRS-001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000201', NOW(), 'EN_TRANSITO')
ON CONFLICT (id) DO UPDATE
SET numero_traspaso = EXCLUDED.numero_traspaso,
    "sedeOrigenId" = EXCLUDED."sedeOrigenId",
    "sedeDestinoId" = EXCLUDED."sedeDestinoId",
    "usuarioSolicitaId" = EXCLUDED."usuarioSolicitaId",
    fecha_solicitud = EXCLUDED.fecha_solicitud,
    estado = EXCLUDED.estado;

INSERT INTO traspaso_detalles (id, "traspasoId", "varianteId", "productoId", cantidad_enviada, cantidad_recibida)
VALUES
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 5, 0)
ON CONFLICT (id) DO UPDATE
SET "traspasoId" = EXCLUDED."traspasoId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    cantidad_enviada = EXCLUDED.cantidad_enviada,
    cantidad_recibida = EXCLUDED.cantidad_recibida;

INSERT INTO devoluciones (id, numero_devolucion, "ventaId", "clienteId", "usuarioProcesaId", tipo, motivo, estado, subtotal, impuesto, total)
VALUES
  ('00000000-0000-0000-0000-000000001201', 'QA-DEV-001', '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000201', 'PARCIAL', 'Prueba de devolucion', 'FINALIZADA', 25000, 4750, 29750)
ON CONFLICT (id) DO UPDATE
SET numero_devolucion = EXCLUDED.numero_devolucion,
    "ventaId" = EXCLUDED."ventaId",
    "clienteId" = EXCLUDED."clienteId",
    "usuarioProcesaId" = EXCLUDED."usuarioProcesaId",
    tipo = EXCLUDED.tipo,
    motivo = EXCLUDED.motivo,
    estado = EXCLUDED.estado,
    subtotal = EXCLUDED.subtotal,
    impuesto = EXCLUDED.impuesto,
    total = EXCLUDED.total;

INSERT INTO devolucion_detalles (id, "devolucionId", "detalleVentaId", "varianteId", "productoId", cantidad_devuelta, precio_unitario_original, subtotal_devolucion, condicion, accion)
VALUES
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 1, 25000, 25000, 'NUEVO', 'REINGRESO_INVENTARIO')
ON CONFLICT (id) DO UPDATE
SET "devolucionId" = EXCLUDED."devolucionId",
    "detalleVentaId" = EXCLUDED."detalleVentaId",
    "varianteId" = EXCLUDED."varianteId",
    "productoId" = EXCLUDED."productoId",
    cantidad_devuelta = EXCLUDED.cantidad_devuelta,
    precio_unitario_original = EXCLUDED.precio_unitario_original,
    subtotal_devolucion = EXCLUDED.subtotal_devolucion,
    condicion = EXCLUDED.condicion,
    accion = EXCLUDED.accion;

INSERT INTO notas_credito (id, numero, "devolucionId", "clienteId", "usuarioId", monto, monto_usado, saldo)
VALUES
  ('00000000-0000-0000-0000-000000001203', 'QA-NC-001', '00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000201', 29750, 0, 29750)
ON CONFLICT (id) DO UPDATE
SET numero = EXCLUDED.numero,
    "devolucionId" = EXCLUDED."devolucionId",
    "clienteId" = EXCLUDED."clienteId",
    "usuarioId" = EXCLUDED."usuarioId",
    monto = EXCLUDED.monto,
    monto_usado = EXCLUDED.monto_usado,
    saldo = EXCLUDED.saldo;

INSERT INTO gastos_operativos (id, "sesionCajaId", "tipoGastoId", "usuarioId", descripcion, monto, num_soporte)
VALUES
  ('00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000201', 'Compra insumos QA', 15000, 'QA-SOP-001')
ON CONFLICT (id) DO UPDATE
SET "sesionCajaId" = EXCLUDED."sesionCajaId",
    "tipoGastoId" = EXCLUDED."tipoGastoId",
    "usuarioId" = EXCLUDED."usuarioId",
    descripcion = EXCLUDED.descripcion,
    monto = EXCLUDED.monto,
    num_soporte = EXCLUDED.num_soporte;

INSERT INTO promociones (id, nombre, descripcion, tipo, valor, fecha_inicio, fecha_fin, estado, aplica_a, minimo_compra, activa)
VALUES
  ('00000000-0000-0000-0000-000000001801', 'Promo QA', 'Promocion para validar integracion', 'DESCUENTO_PORCENTAJE', 10, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 day', 'ACTIVA', 'producto', 0, TRUE)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    tipo = EXCLUDED.tipo,
    valor = EXCLUDED.valor,
    fecha_inicio = EXCLUDED.fecha_inicio,
    fecha_fin = EXCLUDED.fecha_fin,
    estado = EXCLUDED.estado,
    aplica_a = EXCLUDED.aplica_a,
    minimo_compra = EXCLUDED.minimo_compra,
    activa = EXCLUDED.activa;

INSERT INTO promocion_items (id, "promocionId", tipo_item, item_id)
VALUES
  ('00000000-0000-0000-0000-000000001802', '00000000-0000-0000-0000-000000001801', 'producto', '00000000-0000-0000-0000-000000000701')
ON CONFLICT (id) DO UPDATE
SET "promocionId" = EXCLUDED."promocionId",
    tipo_item = EXCLUDED.tipo_item,
    item_id = EXCLUDED.item_id;

INSERT INTO promocion_niveles ("promocionId", nivel)
VALUES
  ('00000000-0000-0000-0000-000000001801', 'BRONCE')
ON CONFLICT ("promocionId", nivel) DO UPDATE
SET nivel = EXCLUDED.nivel;

INSERT INTO notificaciones (id, tipo, titulo, mensaje, "usuarioId", "sedeId", tipo_referencia)
VALUES
  ('00000000-0000-0000-0000-000000001501', 'SISTEMA', 'Seed QA ejecutado', 'Datos de prueba creados correctamente', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'seed')
ON CONFLICT (id) DO UPDATE
SET tipo = EXCLUDED.tipo,
    titulo = EXCLUDED.titulo,
    mensaje = EXCLUDED.mensaje,
    "usuarioId" = EXCLUDED."usuarioId",
    "sedeId" = EXCLUDED."sedeId",
    tipo_referencia = EXCLUDED.tipo_referencia;

INSERT INTO sync_logs (id, tabla, operacion, registro_id, payload, estado, error_msg)
VALUES
  ('00000000-0000-0000-0000-000000001502', 'productos', 'INSERT', '00000000-0000-0000-0000-000000000701', '{"origen":"seed"}', 'SINCRONIZADO', NULL)
ON CONFLICT (id) DO UPDATE
SET tabla = EXCLUDED.tabla,
    operacion = EXCLUDED.operacion,
    registro_id = EXCLUDED.registro_id,
    payload = EXCLUDED.payload,
    estado = EXCLUDED.estado,
    error_msg = EXCLUDED.error_msg;

INSERT INTO auditoria_sistema (id, "usuarioId", tabla_afectada, tipo_evento, registro_id, datos_despues, ip_address, user_agent)
VALUES
  ('00000000-0000-0000-0000-000000001701', '00000000-0000-0000-0000-000000000201', 'seed_todas_las_tablas', 'INSERT', '00000000-0000-0000-0000-000000000701', '{"ok":true}', '127.0.0.1', 'seed-script')
ON CONFLICT (id) DO UPDATE
SET "usuarioId" = EXCLUDED."usuarioId",
    tabla_afectada = EXCLUDED.tabla_afectada,
    tipo_evento = EXCLUDED.tipo_evento,
    registro_id = EXCLUDED.registro_id,
    datos_despues = EXCLUDED.datos_despues,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent;

INSERT INTO reporte_ventas_diarias (id, fecha, "sedeId", total_ventas, num_transacc, ticket_promedio)
VALUES
  ('00000000-0000-0000-0000-000000001901', CURRENT_DATE, '00000000-0000-0000-0000-000000000101', 29750, 1, 29750)
ON CONFLICT (id) DO UPDATE
SET fecha = EXCLUDED.fecha,
    "sedeId" = EXCLUDED."sedeId",
    total_ventas = EXCLUDED.total_ventas,
    num_transacc = EXCLUDED.num_transacc,
    ticket_promedio = EXCLUDED.ticket_promedio;

COMMIT;
