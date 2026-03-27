# 🛠️ Stack Tecnológico

## Resumen del Stack

```
Frontend:    React 18 + Vite + Tailwind CSS + Zustand + TanStack Query
Desktop:     Electron.js
Backend:     NestJS 10 (Node.js) + TypeScript
Base Datos:  PostgreSQL 16 (local) + Supabase (cloud backup)
Caché/Colas: Redis 7 + Bull
ORM:         TypeORM
Auth:        JWT + Passport.js
Monorepo:    Turborepo
Contenedor:  Docker + Docker Compose
```

---

## Frontend

### React + Vite
- **React 18** — librería UI con soporte a Concurrent Mode
- **Vite 5** — bundler ultrarrápido para desarrollo local
- **TypeScript** — tipado estático end-to-end

### Estilos y UI
- **Tailwind CSS 3** — utilidades CSS con paleta personalizada
- **Componentes propios** — librería interna en `packages/ui`

### Estado y Datos
- **Zustand 5** — manejo de estado global (auth, carrito, configuración)
- **TanStack Query 5** — fetching, caché y sincronización de datos del servidor
- **Axios** — cliente HTTP con interceptores JWT automáticos

### Offline / Local
- **Dexie.js (IndexedDB)** — almacenamiento local para cola de ventas offline

---

## Desktop

### Electron.js
- Empaqueta la app React como aplicación de escritorio nativa
- Genera instalador `.exe` para Windows
- Acceso a hardware: impresoras térmicas, lectores de código de barras
- Ventana 1400x900, sin dependencia de navegador externo

---

## Backend

### NestJS + TypeScript
- **NestJS 10** — framework Node.js con arquitectura modular
- **TypeScript** — mismo lenguaje que el frontend (tipos compartidos)
- **Decoradores** — inyección de dependencias, guards, interceptores
- **ts-node-dev** — ejecución directa en desarrollo sin compilación previa

### Librerías Clave
| Librería | Uso |
|----------|-----|
| `@nestjs/jwt` | Generación y validación de tokens JWT |
| `@nestjs/passport` | Estrategias de autenticación |
| `@nestjs/typeorm` | Integración ORM con PostgreSQL |
| `@nestjs/swagger` | Documentación API automática |
| `@nestjs/bull` | Colas de trabajo (sync cloud) |
| `@nestjs/schedule` | Cron jobs (backups programados) |
| `@nestjs/websockets` | WebSockets para stock en tiempo real |
| `bcryptjs` | Hash de contraseñas |
| `class-validator` | Validación de DTOs |
| `helmet` | Headers de seguridad HTTP |

---

## Base de Datos

### PostgreSQL 16 (Local)
- Base de datos principal — toda la operación diaria
- Corre en Docker localmente
- Gestionado con pgAdmin en `http://localhost:5050`

### Supabase (Cloud Backup)
- PostgreSQL gestionado en la nube
- Backup automático nocturno
- Punto de migración cuando se pase a producción online
- Capa gratuita generosa para empezar

### Redis 7
- Caché de consultas frecuentes
- Cola de trabajos con Bull (sincronización cloud)
- Gestión de sesiones

### TypeORM
- ORM que soporta PostgreSQL local y cloud
- `synchronize: true` en desarrollo (auto-migración)
- `synchronize: false` en producción (migraciones manuales)

---

## Monorepo — Turborepo

```
integralcosmeticos/
├── apps/
│   ├── backend/        ← NestJS API
│   └── desktop/        ← React + Electron
├── packages/
│   ├── shared-types/   ← Interfaces TypeScript compartidas
│   ├── ui/             ← Componentes React reutilizables
│   └── config/         ← ESLint, TSConfig base
├── docker-compose.yml
├── turbo.json
└── package.json
```

**Ventaja clave:** los tipos TypeScript definidos en `shared-types` son usados tanto en NestJS como en React, eliminando inconsistencias entre frontend y backend.

---

## Justificación del Stack

### ¿Por qué NestJS sobre Spring Boot?
| Factor | NestJS | Spring Boot |
|--------|--------|-------------|
| Lenguaje | TypeScript (mismo que React) | Java (diferente al frontend) |
| Tipos compartidos | ✅ Sí | ❌ No |
| Velocidad de desarrollo | Alta | Media |
| Arranque local | < 3 segundos | 10-15 segundos |
| Ideal para | I/O intensivo, real-time | CPU intensivo, microservicios |
| Tendencia 2026 | TypeScript #1 en GitHub | Java estable |

### ¿Por qué arquitectura local-first?
- **Sin dependencia de internet** para operar la tienda
- **Velocidad máxima** — todas las operaciones contra base de datos local
- **Backup silencioso** — Supabase sincroniza en segundo plano
- **Migración limpia** — el mismo código NestJS se despliega en cloud
