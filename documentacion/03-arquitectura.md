# 🏗️ Arquitectura del Sistema

## Filosofía: Local-First, Cloud-Ready

El sistema opera completamente de forma local en la red de cada tienda. La nube actúa exclusivamente como capa de backup y futura plataforma de producción. Ninguna operación crítica depende de internet.

```
┌─────────────────────────────────────────────────────┐
│                    RED LOCAL (LAN)                   │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │  PC Cajero 1 │    │  PC Cajero 2 │               │
│  │ React+Electron    │ React+Electron               │
│  └──────┬───────┘    └──────┬───────┘               │
│         │                  │                        │
│         └────────┬─────────┘                        │
│                  │ HTTP/WS (LAN)                     │
│         ┌────────▼───────┐                          │
│         │  PC Servidor   │                          │
│         │  NestJS :3000  │                          │
│         │  PostgreSQL    │                          │
│         │  Redis         │                          │
│         └────────┬───────┘                          │
└──────────────────┼──────────────────────────────────┘
                   │ Sync en background (si hay internet)
          ┌────────▼───────┐
          │  SUPABASE CLOUD │
          │  PostgreSQL     │
          │  (Backup)       │
          └────────────────┘
```

---

## Capas del Sistema

### Capa de Presentación (Frontend)

- **React + Vite** corriendo dentro de **Electron**
- Cada terminal de caja tiene la app instalada
- Se conecta al servidor NestJS por red local (LAN)
- Cola offline con **Dexie.js** si cae la red interna

### Capa de Aplicación (Backend)

- **NestJS** corriendo en el PC servidor de la tienda
- Expone API REST en `http://[IP-SERVIDOR]:3000/api/v1`
- WebSockets para actualización en tiempo real de stock
- Bull Queue para sincronización asíncrona al cloud

### Capa de Datos (Base de Datos)

- **PostgreSQL 16** — fuente de verdad principal
- **Redis 7** — caché y cola de trabajos
- **Supabase** — réplica cloud para backup

---

## Arquitectura Interna NestJS

Organizada por dominio de negocio (Domain-Driven Design):

```
backend/src/
├── modules/
│   ├── auth/           ← Autenticación y autorización
│   ├── usuarios/       ← Gestión de empleados
│   ├── sedes/          ← Tiendas y bodegas
│   ├── categorias/     ← Categorías de productos
│   ├── marcas/         ← Marcas de productos
│   ├── productos/      ← Catálogo y variantes
│   ├── inventario/     ← Stock y movimientos
│   ├── proveedores/    ← Proveedores y órdenes de compra
│   ├── clientes/       ← CRM y fidelización
│   ├── ventas/         ← POS y transacciones
│   ├── caja/           ← Apertura y cierre de caja
│   ├── reportes/       ← Analytics y dashboards
│   └── sync/           ← Sincronización cloud
├── common/
│   ├── filters/        ← Manejo global de errores
│   ├── guards/         ← Protección de rutas
│   ├── interceptors/   ← Logs y transformaciones
│   └── pipes/          ← Validación de datos
└── config/
    ├── database.config.ts
    ├── redis.config.ts
    └── app.config.ts
```

---

## Patrón por Módulo

Cada módulo sigue la misma estructura limpia:

```
productos/
├── productos.module.ts       ← Registra el módulo
├── productos.controller.ts   ← Rutas HTTP
├── productos.service.ts      ← Lógica de negocio
├── productos.entity.ts       ← Entidad TypeORM
└── dto/
    ├── create-producto.dto.ts
    └── update-producto.dto.ts
```

---

## Flujo de Sincronización Cloud

```
1. Cajero realiza una venta
        ↓
2. NestJS guarda en PostgreSQL LOCAL (inmediato)
        ↓
3. Venta agregada a Cola Bull (Redis)
        ↓
4. Worker en background intenta sync con Supabase
        ↓
   ¿Hay internet?
   SÍ → Sincroniza → Marca como SINCRONIZADO
   NO → Reintenta cada 5 min → Cola queda pendiente
        ↓
5. Cuando vuelve internet → sincroniza todo lo pendiente
        ↓
6. Log de sincronización actualizado
```

### Endpoint y control operativo

- Endpoint interno de monitoreo: `GET /api/sync/status`
- Endpoint de ejecución manual: `POST /api/sync/forzar`
- Ambos endpoints requieren JWT y rol `ADMIN`.
- El módulo `sync` usa Bull (`queue: sync`) y guarda trazabilidad en `sync_logs`.

### Componentes involucrados

- `SyncService`: resuelve registros locales, encola sincronización y registra logs.
- `SyncProcessor`: procesa trabajos `sync-tabla` con reintentos exponenciales.
- `SyncLog` entity: persiste estado (`OK` o `ERROR`), tabla, operación y error.
- `backupNocturno` (`cron 02:00`): ejecuta respaldo por `pg_dump` usando `SUPABASE_DB_URL`.

---

## Estrategia de Migración a Cloud

Cuando se desee migrar a producción en la nube:

```bash
# Solo cambiar variables de entorno — mismo código NestJS
POSTGRES_HOST=db.supabase.co      # antes: localhost
NODE_ENV=production                # antes: local
```

1. Desplegar NestJS en Railway/Render
2. Cambiar `POSTGRES_HOST` a Supabase cloud
3. Convertir Electron en app web (React puro)
4. Sin reescritura de lógica de negocio
