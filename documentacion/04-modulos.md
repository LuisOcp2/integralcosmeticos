# 📦 Módulos del Sistema

## Mapa de Módulos

```
┌─────────────────────────────────────────────────────────┐
│                    INTEGRAL COSMÉTICOS                   │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│   AUTH   │ USUARIOS │  SEDES   │CATEGORÍAS│   MARCAS   │
├──────────┴──────────┴──────────┴──────────┴────────────┤
│              PRODUCTOS + VARIANTES + CÓDIGOS            │
├─────────────────────────────────────────────────────────┤
│         INVENTARIO (Stock × Sede + Movimientos)         │
├───────────────────┬─────────────────────────────────────┤
│    PROVEEDORES    │         ÓRDENES DE COMPRA           │
├───────────────────┴─────────────────────────────────────┤
│              VENTAS / POS + CIERRE DE CAJA              │
├─────────────────────────────────────────────────────────┤
│              CLIENTES / CRM + FIDELIZACIÓN              │
├─────────────────────────────────────────────────────────┤
│                  REPORTES + ANALYTICS                   │
├─────────────────────────────────────────────────────────┤
│              SINCRONIZACIÓN CLOUD (SUPABASE)            │
└─────────────────────────────────────────────────────────┘
```

---

## Módulo 1 — Autenticación (Auth)

**Estado:** ✅ Completado

### Funcionalidades

- Login con email y password
- Generación de JWT (expira en 8h)
- Refresh de sesión
- Cierre de sesión
- Protección de rutas por rol

### Roles del Sistema

| Rol          | Descripción         | Acceso                         |
| ------------ | ------------------- | ------------------------------ |
| `ADMIN`      | Administrador total | Todo el sistema                |
| `SUPERVISOR` | Jefe de tienda      | Reportes, usuarios, inventario |
| `CAJERO`     | Operador de caja    | POS, ventas, clientes          |
| `BODEGUERO`  | Almacenista         | Inventario, proveedores        |

---

## Módulo 2 — Usuarios

**Estado:** ✅ Completado

### Funcionalidades

- Crear usuario con rol asignado
- Listar usuarios activos
- Desactivar usuario (soft delete)
- Seed de usuario admin inicial
- Encriptación de contraseñas con bcrypt

---

## Módulo 3 — Sedes

**Estado:** ⏳ Pendiente

### Funcionalidades

- Crear y gestionar sedes/tiendas
- Asignar usuarios a sede
- Configuración por sede (moneda, impuestos)
- Estado activa/inactiva

### Campos

- Nombre, dirección, ciudad, teléfono
- Tipo: TIENDA | BODEGA | PRINCIPAL

---

## Módulo 4 — Catálogo (Productos)

**Estado:** ⏳ Pendiente (Fase 2)

### Funcionalidades

- CRUD de categorías y marcas
- CRUD de productos con imagen
- Gestión de variantes (tono, tamaño, presentación)
- Código de barras por variante
- SKU único por variante
- Precio base + precio extra por variante
- Activar/desactivar productos

### Estructura de Producto

```

### Importaciones masivas de catalogo (CSV/XLSX)

- Soporte de carga por archivo `.csv` y `.xlsx`.
- Flujo en dos pasos: `dry-run` + `ejecucion`.
- Upsert idempotente para productos y variantes.
- Reporte por fila (creado, actualizado, omitido, error).
- Reglas de negocio aplicadas en lote (precios, IVA, unicos).

Referencia completa: `documentacion/14-importaciones-catalogo.md`.
Producto
├── Nombre, descripción
├── Categoría (ej: Maquillaje, Skincare)
├── Marca (ej: MAC, L'Oréal)
├── Precio base de venta
├── Precio de costo
├── % IVA
└── Variantes[]
    ├── Nombre (ej: "Tono Nude 01")
    ├── Código de barras
    ├── SKU
    └── Precio extra sobre base
```

---

## Módulo 5 — Inventario

**Estado:** ⏳ Pendiente (Fase 2)

### Funcionalidades

- Stock por variante × sede
- Entrada de mercancía
- Salida de mercancía
- Traslado entre sedes
- Ajuste de inventario
- Alertas de stock mínimo
- Historial de movimientos

### Tipos de Movimiento

| Tipo         | Descripción        |
| ------------ | ------------------ |
| `ENTRADA`    | Compra a proveedor |
| `SALIDA`     | Venta al cliente   |
| `TRASLADO`   | De bodega a tienda |
| `AJUSTE`     | Corrección manual  |
| `DEVOLUCION` | Retorno de cliente |

---

## Módulo 6 — Proveedores

**Estado:** ⏳ Pendiente (Fase 2)

### Funcionalidades

- CRUD de proveedores
- Órdenes de compra
- Recepción de mercancía (genera entrada en inventario)
- Historial de compras por proveedor

---

## Módulo 7 — Ventas / POS

**Estado:** ⏳ Pendiente (Fase 3)

### Funcionalidades

- Apertura de caja con monto inicial
- Agregar productos por código de barras o búsqueda
- Aplicar descuentos por ítem o total
- Múltiples métodos de pago (efectivo, tarjeta, mixto)
- Impresión de ticket térmico
- Generación de PDF
- Cierre de caja con arqueo
- Devoluciones (afecta inventario automáticamente)
- Notas crédito
- Cola offline si cae la LAN

---

## Módulo 8 — Clientes / CRM

**Estado:** ⏳ Pendiente (Fase 4)

### Funcionalidades

- Registro de clientes con tipo de documento configurable desde módulo maestro
- Historial de compras por cliente
- Programa de puntos de fidelidad
- Búsqueda por documento, nombre, teléfono
- Alertas de cumpleaños
- Segmentación por frecuencia de compra

---

## Módulo 11 — Configuraciones Maestro

**Estado:** ✅ Implementado

### Funcionalidades

- Panel maestro centralizado para parámetros operativos
- CRUD de categorías (catálogo)
- CRUD de marcas (catálogo)
- CRUD de tipos de documento para clientes
- CRUD de parámetros de configuración (clave/valor/tipo/modulo)
- Endpoint agregado para sincronizar catálogos maestros con frontend

### Objetivo

- Evitar cambios frecuentes de código por ajustes funcionales de negocio
- Estandarizar catálogos reutilizados por POS, clientes, inventario y reportes

## Módulo 9 — Reportes

**Estado:** ⏳ Pendiente (Fase 4)

### Reportes Disponibles

| Reporte                | Descripción                    |
| ---------------------- | ------------------------------ |
| Ventas del día         | Resumen de ventas por fecha    |
| Ventas por sede        | Comparativa entre tiendas      |
| Productos más vendidos | Top 10 por volumen y valor     |
| Margen por producto    | Precio venta vs costo          |
| Stock actual           | Inventario disponible por sede |
| Productos bajo mínimo  | Alertas de reabastecimiento    |
| Clientes frecuentes    | Ranking por compras            |
| Cierre de caja         | Resumen diario por cajero      |

---

## Módulo 10 — Sincronización Cloud

**Estado:** ⏳ Pendiente (Fase 5)

### Funcionalidades

- Sync automático en background cada 5 min
- Cola de operaciones pendientes (Bull + Redis)
- Manejo de conflictos por timestamp
- Log de sincronización
- Backup nocturno completo (pg_dump a Supabase)
- Panel de estado de sync para admin
