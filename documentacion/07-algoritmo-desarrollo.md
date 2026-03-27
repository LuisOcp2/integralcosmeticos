# 🧩 Algoritmo de Desarrollo

## Principios Fundamentales

1. **Nunca saltarse una fase** — cada módulo depende del anterior
2. **Local primero, cloud en segundo plano** — ninguna operación crítica espera respuesta del cloud
3. **Un solo tipo TypeScript para todo** — cambios en entidades se reflejan en el frontend en tiempo de compilación
4. **Soft delete siempre** — nada se borra físicamente de la base de datos
5. **Logs de auditoría** — todo movimiento de inventario y venta queda registrado

---

## Fases de Desarrollo

### ✅ FASE 1 — Fundamentos
**Duración estimada:** 2 semanas
**Estado:** COMPLETADA

```
[✅] Setup Monorepo Turborepo
[✅] Docker Compose (PostgreSQL 16 + Redis 7 + pgAdmin)
[✅] NestJS con ts-node-dev
[✅] TypeORM conectado a PostgreSQL local
[✅] Módulo Auth (JWT + Passport + Roles)
[✅] Guards de roles (ADMIN, CAJERO, BODEGUERO, SUPERVISOR)
[✅] Módulo Usuarios (CRUD + bcrypt)
[✅] Endpoint Seed para usuario admin inicial
[✅] Swagger en /api/docs
[✅] React + Vite + Electron base
[✅] Shared Types (interfaces TS compartidas)
[✅] Variables de entorno separadas (.env.local / .env.production)
```

---

### ⏳ FASE 2 — Catálogo & Inventario
**Duración estimada:** 2 semanas

```
[ ] Módulo Sedes (CRUD de tiendas y bodegas)
[ ] Módulo Categorías
[ ] Módulo Marcas
[ ] Módulo Productos (CRUD con variantes y códigos de barra)
[ ] Módulo Inventario (stock × sede)
[ ] Movimientos de inventario (entrada, salida, traslado)
[ ] Alertas de stock mínimo
[ ] Módulo Proveedores
[ ] Órdenes de compra
[ ] UI React: Pantalla catálogo de productos
[ ] UI React: Pantalla inventario por sede
```

---

### ⏳ FASE 3 — Operación / POS
**Duración estimada:** 2 semanas

```
[ ] Módulo Ventas (crear venta, detalle, total)
[ ] Búsqueda de producto por código de barras
[ ] Carrito de compras (Zustand)
[ ] Múltiples métodos de pago
[ ] Descuentos por ítem y total
[ ] Módulo Caja (apertura, cierre, arqueo)
[ ] Generación de ticket PDF
[ ] Impresión térmica vía Electron
[ ] Devoluciones y notas crédito
[ ] Cola offline con Dexie.js
[ ] UI React: POS completo
[ ] UI React: Pantalla cierre de caja
```

---

### ⏳ FASE 4 — Inteligencia de Negocio
**Duración estimada:** 2 semanas

```
[ ] Módulo Clientes (CRUD + búsqueda por documento)
[ ] Historial de compras por cliente
[ ] Programa de puntos de fidelidad
[ ] Módulo Reportes
[ ] Dashboard: ventas del día
[ ] Reporte: productos más vendidos
[ ] Reporte: margen por producto
[ ] Reporte: stock actual por sede
[ ] Reporte: comparativa entre sedes
[ ] Reporte: cierre de caja diario
[ ] UI React: Dashboard con gráficas
[ ] UI React: Módulo de clientes
```

---

### ⏳ FASE 5 — Producción
**Duración estimada:** 2 semanas

```
[ ] Módulo Sync (Bull Queue → Supabase)
[ ] Cron job de backup nocturno
[ ] Panel de estado de sincronización
[ ] Electron build (.exe instalador Windows)
[ ] Integración con impresora térmica
[ ] Integración con lector de código de barras USB
[ ] Tests unitarios NestJS (Jest)
[ ] Tests E2E (Supertest)
[ ] Hardening seguridad (rate limiting, CORS, Helmet)
[ ] Manual de usuario para cajeros
[ ] Manual de usuario para administradores
[ ] Guía de despliegue en cloud (Railway + Supabase)
```

---

## Flujo de Trabajo por Módulo

Para cada nuevo módulo, seguir este orden:

```
1. Definir interfaz en packages/shared-types/
        ↓
2. Crear entidad TypeORM (.entity.ts)
        ↓
3. Crear DTOs con validaciones (class-validator)
        ↓
4. Implementar Service (lógica de negocio)
        ↓
5. Implementar Controller (rutas HTTP)
        ↓
6. Registrar en Module
        ↓
7. Importar Module en AppModule
        ↓
8. Verificar en Swagger (/api/docs)
        ↓
9. Crear pantalla React que consuma el endpoint
        ↓
10. Conectar con TanStack Query
```

---

## Reglas de Código

### Nombrado
- Entidades: PascalCase singular (`Producto`, `Variante`)
- Tablas DB: snake_case plural (`productos`, `detalle_ventas`)
- Variables: camelCase (`precioVenta`, `stockMinimo`)
- Enums: SCREAMING_SNAKE_CASE (`ADMIN`, `TIPO_MOVIMIENTO`)
- Archivos: kebab-case (`create-producto.dto.ts`)

### Commits
Seguir Conventional Commits:
```
feat: agregar módulo de productos
fix: corregir cálculo de IVA en ventas
docs: actualizar documentación de endpoints
refactor: extraer lógica de descuentos a servicio
test: agregar tests para AuthService
chore: actualizar dependencias
```
