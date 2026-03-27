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

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ Público | Iniciar sesión |
| GET | `/auth/perfil` | ✅ JWT | Perfil del usuario autenticado |
| POST | `/auth/logout` | ✅ JWT | Cerrar sesión |

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

| Método | Endpoint | Auth | Roles | Descripción |
|--------|----------|------|-------|-------------|
| POST | `/usuarios/seed` | ❌ Público | — | Crear admin inicial |
| POST | `/usuarios` | ✅ JWT | ADMIN | Crear usuario |
| GET | `/usuarios` | ✅ JWT | ADMIN, SUPERVISOR | Listar usuarios |
| GET | `/usuarios/:id` | ✅ JWT | Todos | Ver usuario |
| DELETE | `/usuarios/:id` | ✅ JWT | ADMIN | Desactivar usuario |

---

## Productos *(Fase 2)*

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/categorias` | ✅ JWT | Listar categorías |
| POST | `/categorias` | ✅ ADMIN | Crear categoría |
| GET | `/marcas` | ✅ JWT | Listar marcas |
| POST | `/marcas` | ✅ ADMIN | Crear marca |
| GET | `/productos` | ✅ JWT | Listar productos (paginado) |
| POST | `/productos` | ✅ ADMIN | Crear producto |
| GET | `/productos/:id` | ✅ JWT | Ver producto con variantes |
| PATCH | `/productos/:id` | ✅ ADMIN | Actualizar producto |
| DELETE | `/productos/:id` | ✅ ADMIN | Desactivar producto |
| GET | `/productos/barcode/:codigo` | ✅ JWT | Buscar por código de barras |

---

## Inventario *(Fase 2)*

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/inventario` | ✅ JWT | Stock actual por sede |
| GET | `/inventario/alertas` | ✅ JWT | Productos bajo stock mínimo |
| POST | `/inventario/entrada` | ✅ BODEGUERO | Registrar entrada |
| POST | `/inventario/salida` | ✅ BODEGUERO | Registrar salida |
| POST | `/inventario/traslado` | ✅ BODEGUERO | Traslado entre sedes |
| GET | `/inventario/movimientos` | ✅ JWT | Historial de movimientos |

---

## Ventas / POS *(Fase 3)*

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/ventas` | ✅ CAJERO | Registrar venta |
| GET | `/ventas` | ✅ JWT | Listar ventas |
| GET | `/ventas/:id` | ✅ JWT | Ver venta detallada |
| POST | `/ventas/:id/anular` | ✅ ADMIN | Anular venta |
| POST | `/caja/apertura` | ✅ CAJERO | Abrir caja |
| POST | `/caja/cierre` | ✅ CAJERO | Cerrar caja con arqueo |

---

## Clientes *(Fase 4)*

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/clientes` | ✅ JWT | Listar clientes |
| POST | `/clientes` | ✅ CAJERO | Crear cliente |
| GET | `/clientes/:id` | ✅ JWT | Ver cliente con historial |
| GET | `/clientes/buscar/:doc` | ✅ JWT | Buscar por documento |
| PATCH | `/clientes/:id/puntos` | ✅ CAJERO | Actualizar puntos |

---

## Health Check

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ Público | Estado del servidor |

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

| Código | Significado |
|--------|-------------|
| 200 | OK — Operación exitosa |
| 201 | Created — Recurso creado |
| 400 | Bad Request — Datos inválidos |
| 401 | Unauthorized — Sin token o token inválido |
| 403 | Forbidden — Sin permisos para este recurso |
| 404 | Not Found — Recurso no encontrado |
| 409 | Conflict — Duplicado (email, SKU, etc.) |
| 500 | Internal Server Error — Error del servidor |
