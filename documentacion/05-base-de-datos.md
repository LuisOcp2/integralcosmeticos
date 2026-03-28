# 🗄️ Base de Datos

## Motor: PostgreSQL 16

**Conexión local:**

```
Host:     localhost
Port:     5432
Database: cosmeticos_db
User:     admin
Password: cosmeticos2026
```

---

## Diagrama Entidad-Relación (Simplificado)

```
USUARIOS ──── SEDES
    │
    └──── VENTAS ──── DETALLE_VENTAS ──── VARIANTES
               │                              │
               └──── CLIENTES          PRODUCTOS
               │                              │
               └──── CIERRE_CAJA       CATEGORIAS
                                              │
INVENTARIO ──── VARIANTES              MARCAS
    │
    └──── MOVIMIENTOS ──── SEDES
    │
    └──── ORDENES_COMPRA ──── PROVEEDORES
```

---

## Tablas del Sistema

### `usuarios`

| Columna   | Tipo             | Descripción                       |
| --------- | ---------------- | --------------------------------- |
| id        | UUID (PK)        | Identificador único               |
| nombre    | VARCHAR(100)     | Nombre del usuario                |
| apellido  | VARCHAR(100)     | Apellido                          |
| email     | VARCHAR (UNIQUE) | Correo electrónico                |
| password  | VARCHAR          | Hash bcrypt                       |
| rol       | ENUM             | ADMIN/CAJERO/BODEGUERO/SUPERVISOR |
| sedeId    | UUID (FK)        | Sede asignada                     |
| activo    | BOOLEAN          | Estado del usuario                |
| createdAt | TIMESTAMP        | Fecha creación                    |
| updatedAt | TIMESTAMP        | Última actualización              |

### `sedes`

| Columna   | Tipo         | Descripción             |
| --------- | ------------ | ----------------------- |
| id        | UUID (PK)    | Identificador único     |
| nombre    | VARCHAR(100) | Nombre de la sede       |
| direccion | TEXT         | Dirección               |
| ciudad    | VARCHAR(100) | Ciudad                  |
| telefono  | VARCHAR(20)  | Teléfono                |
| tipo      | ENUM         | TIENDA/BODEGA/PRINCIPAL |
| activa    | BOOLEAN      | Estado                  |

### `categorias`

| Columna     | Tipo         | Descripción         |
| ----------- | ------------ | ------------------- |
| id          | UUID (PK)    | Identificador único |
| nombre      | VARCHAR(100) | Nombre categoría    |
| descripcion | TEXT         | Descripción         |
| activa      | BOOLEAN      | Estado              |

### `marcas`

| Columna | Tipo         | Descripción         |
| ------- | ------------ | ------------------- |
| id      | UUID (PK)    | Identificador único |
| nombre  | VARCHAR(100) | Nombre de la marca  |
| logoUrl | VARCHAR      | URL del logo        |

### `tipos_documento_configuracion`

| Columna     | Tipo               | Descripción                  |
| ----------- | ------------------ | ---------------------------- |
| id          | UUID (PK)          | Identificador único          |
| codigo      | VARCHAR(20) UNIQUE | Código del tipo de documento |
| nombre      | VARCHAR(100)       | Nombre visible               |
| descripcion | TEXT               | Descripción opcional         |
| activo      | BOOLEAN            | Estado                       |
| createdAt   | TIMESTAMP          | Fecha creación               |
| updatedAt   | TIMESTAMP          | Última actualización         |

### `parametros_configuracion`

| Columna     | Tipo                | Descripción                        |
| ----------- | ------------------- | ---------------------------------- |
| id          | UUID (PK)           | Identificador único                |
| clave       | VARCHAR(120) UNIQUE | Clave técnica (`modulo.parametro`) |
| valor       | TEXT                | Valor serializado                  |
| descripcion | TEXT                | Descripción funcional              |
| tipoDato    | VARCHAR(20)         | STRING/NUMBER/BOOLEAN/JSON         |
| modulo      | VARCHAR(60)         | Módulo dueño del parámetro         |
| activo      | BOOLEAN             | Estado                             |
| createdAt   | TIMESTAMP           | Fecha creación                     |
| updatedAt   | TIMESTAMP           | Última actualización               |

Parámetros base sugeridos cargables por seed/bootstrap:

- `empresa.nombre_comercial`
- `empresa.nit`
- `venta.moneda`
- `venta.iva_defecto`
- `venta.permitir_descuento_libre`
- `venta.descuento_maximo_porcentaje`
- `ticket.prefijo_venta`
- `ticket.mostrar_nit_cliente`
- `inventario.stock_minimo_defecto`
- `inventario.alerta_critica_umbral`
- `sync.intervalo_minutos`
- `clientes.puntos_por_cada_1000`
- `clientes.tipo_documento_defecto`
- `importaciones.modo_defecto`
- `reportes.zona_horaria`

### `productos`

| Columna       | Tipo             | Descripción          |
| ------------- | ---------------- | -------------------- |
| id            | UUID (PK)        | Identificador único  |
| nombre        | VARCHAR(200)     | Nombre del producto  |
| descripcion   | TEXT             | Descripción          |
| codigoInterno | VARCHAR (UNIQUE) | Código interno       |
| categoriaId   | UUID (FK)        | Categoría            |
| marcaId       | UUID (FK)        | Marca                |
| precioVenta   | DECIMAL(12,2)    | Precio de venta base |
| precioCosto   | DECIMAL(12,2)    | Precio de costo      |
| impuesto      | DECIMAL(5,2)     | % IVA                |
| imagenUrl     | VARCHAR          | URL imagen           |
| activo        | BOOLEAN          | Estado               |

### `variantes`

| Columna      | Tipo             | Descripción         |
| ------------ | ---------------- | ------------------- |
| id           | UUID (PK)        | Identificador único |
| productoId   | UUID (FK)        | Producto padre      |
| nombre       | VARCHAR(200)     | Nombre variante     |
| codigoBarras | VARCHAR (UNIQUE) | Código de barras    |
| sku          | VARCHAR (UNIQUE) | SKU único           |
| precioExtra  | DECIMAL(12,2)    | Precio adicional    |
| activa       | BOOLEAN          | Estado              |

### `stock`

| Columna             | Tipo      | Descripción          |
| ------------------- | --------- | -------------------- |
| id                  | UUID (PK) | Identificador único  |
| varianteId          | UUID (FK) | Variante             |
| sedeId              | UUID (FK) | Sede                 |
| cantidad            | INTEGER   | Cantidad disponible  |
| stockMinimo         | INTEGER   | Alerta bajo stock    |
| stockMaximo         | INTEGER   | Stock máximo         |
| ultimaActualizacion | TIMESTAMP | Última actualización |

### `movimientos_inventario`

| Columna       | Tipo      | Descripción                    |
| ------------- | --------- | ------------------------------ |
| id            | UUID (PK) | Identificador único            |
| varianteId    | UUID (FK) | Variante afectada              |
| sedeOrigenId  | UUID (FK) | Sede origen (traslados)        |
| sedeDestinoId | UUID (FK) | Sede destino                   |
| tipo          | ENUM      | ENTRADA/SALIDA/TRASLADO/AJUSTE |
| cantidad      | INTEGER   | Cantidad movida                |
| motivo        | TEXT      | Razón del movimiento           |
| usuarioId     | UUID (FK) | Usuario que registra           |
| createdAt     | TIMESTAMP | Fecha del movimiento           |

### `clientes`

| Columna         | Tipo         | Descripción                                           |
| --------------- | ------------ | ----------------------------------------------------- |
| id              | UUID (PK)    | Identificador único                                   |
| nombre          | VARCHAR(100) | Nombre                                                |
| apellido        | VARCHAR(100) | Apellido                                              |
| documento       | VARCHAR(20)  | Número documento                                      |
| tipoDocumento   | VARCHAR(20)  | Código dinámico según `tipos_documento_configuracion` |
| email           | VARCHAR      | Correo                                                |
| telefono        | VARCHAR(20)  | Teléfono                                              |
| puntosFidelidad | INTEGER      | Puntos acumulados                                     |
| activo          | BOOLEAN      | Estado                                                |

### `ventas`

| Columna    | Tipo                | Descripción          |
| ---------- | ------------------- | -------------------- |
| id         | UUID (PK)           | Identificador único  |
| numero     | VARCHAR (UNIQUE)    | VTA-2026-00001       |
| sedeId     | UUID (FK)           | Sede                 |
| usuarioId  | UUID (FK)           | Cajero               |
| clienteId  | UUID (FK, nullable) | Cliente (opcional)   |
| subtotal   | DECIMAL(12,2)       | Subtotal             |
| descuento  | DECIMAL(12,2)       | Descuento total      |
| impuesto   | DECIMAL(12,2)       | IVA total            |
| total      | DECIMAL(12,2)       | Total a pagar        |
| metodoPago | ENUM                | EFECTIVO/TARJETA/etc |
| estado     | ENUM                | COMPLETADA/ANULADA   |
| createdAt  | TIMESTAMP           | Fecha venta          |

### `detalle_ventas`

| Columna        | Tipo          | Descripción          |
| -------------- | ------------- | -------------------- |
| id             | UUID (PK)     | Identificador único  |
| ventaId        | UUID (FK)     | Venta padre          |
| varianteId     | UUID (FK)     | Variante vendida     |
| cantidad       | INTEGER       | Unidades vendidas    |
| precioUnitario | DECIMAL(12,2) | Precio en el momento |
| descuentoItem  | DECIMAL(12,2) | Descuento por ítem   |
| subtotal       | DECIMAL(12,2) | Subtotal del ítem    |

### `cierre_caja`

| Columna       | Tipo          | Descripción                    |
| ------------- | ------------- | ------------------------------ |
| id            | UUID (PK)     | Identificador único            |
| sedeId        | UUID (FK)     | Sede                           |
| usuarioId     | UUID (FK)     | Cajero                         |
| fechaApertura | TIMESTAMP     | Apertura de caja               |
| fechaCierre   | TIMESTAMP     | Cierre de caja                 |
| montoInicial  | DECIMAL(12,2) | Efectivo inicial               |
| montoFinal    | DECIMAL(12,2) | Efectivo final contado         |
| totalVentas   | DECIMAL(12,2) | Total ventas del turno         |
| diferencia    | DECIMAL(12,2) | Diferencia (sobrante/faltante) |

---

## Convenciones

- **IDs:** UUID v4 generados por PostgreSQL (`uuid_generate_v4()`)
- **Fechas:** TIMESTAMP con timezone UTC
- **Precios:** DECIMAL(12,2) para manejar hasta 999.999.999.99 COP
- **Soft Delete:** Los registros nunca se borran, solo se desactivan (`activo = false`)
- **Auditoría:** Todas las tablas tienen `createdAt` y `updatedAt`
