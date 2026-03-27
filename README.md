# 🧴 Integral Cosméticos — Sistema de Gestión

Sistema integral para cadena de venta de cosméticos. Arquitectura **local-first** con backup cloud, lista para escalar.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Desktop | Electron.js |
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL (local) + Supabase (cloud backup) |
| Caché / Colas | Redis + Bull |
| ORM | TypeORM |
| Monorepo | Turborepo |

## Estructura del Proyecto

```
integralcosmeticos/
├── apps/
│   ├── backend/          ← API REST (NestJS)
│   └── desktop/          ← App escritorio (React + Electron)
├── packages/
│   ├── shared-types/     ← Interfaces TypeScript compartidas
│   ├── ui/               ← Componentes React reutilizables
│   └── config/           ← Configuraciones base compartidas
├── docker-compose.yml    ← PostgreSQL + Redis + pgAdmin
└── turbo.json
```

## Módulos del Sistema

- 🔐 **Auth** — Login, roles (Admin, Cajero, Bodeguero)
- 🧴 **Productos** — Catálogo, variantes, códigos de barra
- 📦 **Inventario** — Stock multi-sede, movimientos, proveedores
- 🛒 **Ventas / POS** — Caja, tickets, métodos de pago
- 👤 **Clientes / CRM** — Historial, puntos de fidelidad
- 📊 **Reportes** — Dashboards de ventas e inventario
- ☁️ **Sync** — Sincronización automática a Supabase

## Inicio Rápido

### 1. Requisitos
- Node.js >= 20
- Docker Desktop
- npm >= 10

### 2. Instalar dependencias
```bash
npm install
```

### 3. Levantar base de datos local
```bash
docker-compose up -d
```

### 4. Configurar variables de entorno
```bash
cp apps/backend/.env.example apps/backend/.env.local
```

### 5. Correr en desarrollo
```bash
npm run dev
```

### Accesos locales
- **Backend API:** http://localhost:3000
- **pgAdmin:** http://localhost:8080
- **Credenciales pgAdmin:** admin@integralcosmeticos.com / admin2026

## Roadmap

- [x] Setup monorepo Turborepo
- [x] Docker Compose (PostgreSQL + Redis)
- [ ] Fase 1: Auth & Roles
- [ ] Fase 2: Catálogo & Inventario
- [ ] Fase 3: POS & Ventas
- [ ] Fase 4: CRM & Reportes
- [ ] Fase 5: Electron Desktop + Sync Cloud
