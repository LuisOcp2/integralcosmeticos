# 🔌 API Endpoints

## Base URL

```
Local:      http://localhost:3000/api/v1
Swagger UI: http://localhost:3000/api/docs
```

## Autenticación

Todos los endpoints protegidos requieren header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth

| Método | Endpoint       | Auth       | Descripción                    |
| ------ | -------------- | ---------- | ------------------------------ |
| POST   | `/auth/login`  | ❌ Público | Iniciar sesión                 |
| GET    | `/auth/perfil` | ✅ JWT     | Perfil del usuario autenticado |
| POST   | `/auth/logout` | ✅ JWT     | Cerrar sesión                  |

### POST `/auth/login`

```json
// Request
{ "email": "admin@cosmeticos.com", "password": "Admin2026!" }

// Response 200
{
  "accessToken": "eyJhbGci...",
  "usuario": {
    "id": "uuid",
    "nombre": "Administrador",
    "email": "admin@cosmeticos.com",
    "rol": "ADMIN"
  }
}
```

---

## Usuarios

| Método | Endpoint         | Auth       | Roles             | Descripción         |
| ------ | ---------------- | ---------- | ----------------- | ------------------- |
| POST   | `/usuarios/seed` | ❌ Público | —                 | Crear admin inicial |
| POST   | `/usuarios`      | ✅ JWT     | ADMIN             | Crear usuario       |
| GET    | `/usuarios`      | ✅ JWT     | ADMIN, SUPERVISOR | Listar usuarios     |
| GET    | `/usuarios/:id`  | ✅ JWT     | Todos             | Ver usuario         |
| DELETE | `/usuarios/:id`  | ✅ JWT     | ADMIN             | Desactivar usuario  |

---

## Productos _(Fase 2)_

| Método | Endpoint                     | Auth     | Descripción                 |
| ------ | ---------------------------- | -------- | --------------------------- |
| GET    | `/categorias`                | ✅ JWT   | Listar categorías           |
| POST   | `/categorias`                | ✅ ADMIN | Crear categoría             |
| GET    | `/marcas`                    | ✅ JWT   | Listar marcas               |
| POST   | `/marcas`                    | ✅ ADMIN | Crear marca                 |
| GET    | `/productos`                 | ✅ JWT   | Listar productos (paginado) |
| POST   | `/productos`                 | ✅ ADMIN | Crear producto              |
| GET    | `/productos/:id`             | ✅ JWT   | Ver producto con variantes  |
| PATCH  | `/productos/:id`             | ✅ ADMIN | Actualizar producto         |
| DELETE | `/productos/:id`             | ✅ ADMIN | Desactivar producto         |
| GET    | `/productos/barcode/:codigo` | ✅ JWT   | Buscar por código de barras |

---

## Inventario _(Fase 2)_

| Método | Endpoint                  | Auth         | Descripción                 |
| ------ | ------------------------- | ------------ | --------------------------- |
| GET    | `/inventario`             | ✅ JWT       | Stock actual por sede       |
| GET    | `/inventario/alertas`     | ✅ JWT       | Productos bajo stock mínimo |
| POST   | `/inventario/entrada`     | ✅ BODEGUERO | Registrar entrada           |
| POST   | `/inventario/salida`      | ✅ BODEGUERO | Registrar salida            |
| POST   | `/inventario/traslado`    | ✅ BODEGUERO | Traslado entre sedes        |
| GET    | `/inventario/movimientos` | ✅ JWT       | Historial de movimientos    |

---

## Ventas / POS _(Fase 3)_

| Método | Endpoint             | Auth      | Descripción            |
| ------ | -------------------- | --------- | ---------------------- |
| POST   | `/ventas`            | ✅ CAJERO | Registrar venta        |
| GET    | `/ventas`            | ✅ JWT    | Listar ventas          |
| GET    | `/ventas/:id`        | ✅ JWT    | Ver venta detallada    |
| POST   | `/ventas/:id/anular` | ✅ ADMIN  | Anular venta           |
| POST   | `/caja/apertura`     | ✅ CAJERO | Abrir caja             |
| POST   | `/caja/cierre`       | ✅ CAJERO | Cerrar caja con arqueo |

---

## Clientes _(Fase 4)_

| Método | Endpoint                | Auth      | Descripción               |
| ------ | ----------------------- | --------- | ------------------------- |
| GET    | `/clientes`             | ✅ JWT    | Listar clientes           |
| POST   | `/clientes`             | ✅ CAJERO | Crear cliente             |
| GET    | `/clientes/:id`         | ✅ JWT    | Ver cliente con historial |
| GET    | `/clientes/buscar/:doc` | ✅ JWT    | Buscar por documento      |
| PATCH  | `/clientes/:id/puntos`  | ✅ CAJERO | Actualizar puntos         |

---

## Sync Cloud

| Método | Endpoint       | Auth   | Roles | Descripción                                         |
| ------ | -------------- | ------ | ----- | --------------------------------------------------- |
| GET    | `/sync/status` | ✅ JWT | ADMIN | Estado de cola, errores e historial reciente        |
| POST   | `/sync/forzar` | ✅ JWT | ADMIN | Encolar sincronización inmediata de tablas críticas |

### GET `/sync/status`

```json
{
  "pendientes": 2,
  "completados": 35,
  "errores": 1,
  "ultimaSync": "2026-03-27T19:43:00.000Z",
  "historial": [
    {
      "id": "uuid",
      "tabla": "ventas",
      "operacion": "upsert",
      "registrosAfectados": 12,
      "estado": "OK",
      "error": null,
      "creadoEn": "2026-03-27T19:43:00.000Z"
    }
  ]
}
```

### POST `/sync/forzar`

```json
{
  "encolados": 3
}
```

---

## Health Check

| Método | Endpoint  | Auth       | Descripción         |
| ------ | --------- | ---------- | ------------------- |
| GET    | `/health` | ❌ Público | Estado del servidor |

```json
// Response
{
  "status": "ok",
  "app": "Integral Cosméticos API",
  "version": "0.1.0",
  "timestamp": "2026-03-27T15:00:00.000Z",
  "environment": "local"
}
```

---

## Códigos de Respuesta

| Código | Significado                                |
| ------ | ------------------------------------------ |
| 200    | OK — Operación exitosa                     |
| 201    | Created — Recurso creado                   |
| 400    | Bad Request — Datos inválidos              |
| 401    | Unauthorized — Sin token o token inválido  |
| 403    | Forbidden — Sin permisos para este recurso |
| 404    | Not Found — Recurso no encontrado          |
| 409    | Conflict — Duplicado (email, SKU, etc.)    |
| 500    | Internal Server Error — Error del servidor |

---

## Estado de implementación

Ultima verificacion: 2026-03-27

| Módulo     | Método | Endpoint                     | Estado          | Observaciones                                                         |
| ---------- | ------ | ---------------------------- | --------------- | --------------------------------------------------------------------- |
| Auth       | POST   | `/auth/login`                | ✅ Implementado | Guard local + JWT activos                                             |
| Auth       | GET    | `/auth/perfil`               | ✅ Implementado | JWT requerido                                                         |
| Auth       | POST   | `/auth/logout`               | ✅ Implementado | JWT requerido                                                         |
| Usuarios   | POST   | `/usuarios/seed`             | ✅ Implementado | Seed admin inicial                                                    |
| Usuarios   | POST   | `/usuarios`                  | ✅ Implementado | Rol ADMIN                                                             |
| Usuarios   | GET    | `/usuarios`                  | ✅ Implementado | Roles ADMIN, SUPERVISOR                                               |
| Usuarios   | GET    | `/usuarios/:id`              | ✅ Implementado | JWT requerido                                                         |
| Usuarios   | DELETE | `/usuarios/:id`              | ✅ Implementado | Rol ADMIN                                                             |
| Productos  | GET    | `/categorias`                | ✅ Implementado | JWT + roles operativos                                                |
| Productos  | POST   | `/categorias`                | ✅ Implementado | Rol ADMIN                                                             |
| Productos  | GET    | `/marcas`                    | ✅ Implementado | JWT + roles operativos                                                |
| Productos  | POST   | `/marcas`                    | ✅ Implementado | Rol ADMIN                                                             |
| Productos  | GET    | `/productos`                 | ✅ Implementado | Soporta `categoriaId`, `marcaId`, `q`, `page`, `limit`                |
| Productos  | POST   | `/productos`                 | ✅ Implementado | Rol ADMIN                                                             |
| Productos  | GET    | `/productos/:id`             | ✅ Implementado | Retorna producto + variantes                                          |
| Productos  | PATCH  | `/productos/:id`             | ✅ Implementado | Rol ADMIN                                                             |
| Productos  | DELETE | `/productos/:id`             | ✅ Implementado | Rol ADMIN (borrado logico)                                            |
| Productos  | GET    | `/productos/barcode/:codigo` | ✅ Implementado | Busca por codigo de barras de variante y retorna producto + variantes |
| Inventario | GET    | `/inventario`                | ✅ Implementado | Requiere query `sedeId`                                               |
| Inventario | GET    | `/inventario/alertas`        | ✅ Implementado | Requiere query `sedeId`; devuelve stock bajo minimo                   |
| Inventario | POST   | `/inventario/entrada`        | ✅ Implementado | Rol BODEGUERO                                                         |
| Inventario | POST   | `/inventario/salida`         | ✅ Implementado | Rol BODEGUERO                                                         |
| Inventario | POST   | `/inventario/traslado`       | ✅ Implementado | Rol BODEGUERO                                                         |
| Inventario | GET    | `/inventario/movimientos`    | ✅ Implementado | Historial de movimientos                                              |
| Ventas/POS | POST   | `/ventas`                    | ✅ Implementado | Rol CAJERO                                                            |
| Ventas/POS | GET    | `/ventas`                    | ✅ Implementado | JWT + roles operativos; permite filtro por `sedeId` y `fecha`         |
| Ventas/POS | GET    | `/ventas/:id`                | ✅ Implementado | Venta detallada                                                       |
| Ventas/POS | POST   | `/ventas/:id/anular`         | ✅ Implementado | Rol ADMIN                                                             |
| Ventas/POS | POST   | `/caja/apertura`             | ✅ Implementado | Alias documental activo                                               |
| Ventas/POS | POST   | `/caja/cierre`               | ✅ Implementado | Cierre por sede con arqueo                                            |
| Clientes   | GET    | `/clientes`                  | ✅ Implementado | Listado de clientes activos                                           |
| Clientes   | POST   | `/clientes`                  | ✅ Implementado | Rol CAJERO                                                            |
| Clientes   | GET    | `/clientes/:id`              | ✅ Implementado | Retorna cliente + historial                                           |
| Clientes   | GET    | `/clientes/buscar/:doc`      | ✅ Implementado | Alias documental activo                                               |
| Clientes   | PATCH  | `/clientes/:id/puntos`       | ✅ Implementado | Rol CAJERO                                                            |
| Sync Cloud | GET    | `/sync/status`               | ✅ Implementado | Rol ADMIN                                                             |
| Sync Cloud | POST   | `/sync/forzar`               | ✅ Implementado | Rol ADMIN                                                             |
| Health     | GET    | `/health`                    | ✅ Implementado | Publico (`/api/v1/health` con prefijo global)                         |

### Notas de consistencia

- Prefijo global vigente: `/api/v1`.
- Swagger UI: `/api/docs`.
- Se conservan aliases adicionales de compatibilidad: `/inventario/traslados`, `/caja/abrir`, `/clientes/documento/:documento`, `/clientes/:id/historial`.
