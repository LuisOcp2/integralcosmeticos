# ⚙️ Infraestructura

## Entorno Local (Actual)

### Servicios Docker

| Servicio | Imagen | Puerto | Credenciales |
|----------|--------|--------|-------------|
| PostgreSQL | postgres:16-alpine | 5432 | admin / cosmeticos2026 |
| Redis | redis:7-alpine | 6379 | — |
| pgAdmin | dpage/pgadmin4 | 5050 | admin@integralcosmeticos.com / admin2026 |

### Comandos Docker
```bash
# Levantar todos los servicios
docker-compose up -d

# Ver estado
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs -f postgres

# Detener todos
docker-compose down

# Detener y borrar volúmenes (⚠️ borra todos los datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart postgres
```

---

## URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api/docs |
| Frontend React | http://localhost:5173 |
| pgAdmin | http://localhost:5050 |

---

## Estrategia de Backup Cloud (Supabase)

### Configuración
1. Crear proyecto en [supabase.com](https://supabase.com) (gratuito)
2. Obtener `SUPABASE_URL` y `SUPABASE_KEY` del panel
3. Agregar al `.env.local`

### Tipos de Backup
| Tipo | Frecuencia | Descripción |
|------|-----------|-------------|
| Sync en tiempo real | Cada 5 min | Operaciones nuevas (ventas, movimientos) |
| Backup nocturno | 2:00 AM | pg_dump completo a Supabase |
| Backup manual | On-demand | Desde panel de administración |

---

## Migración a Producción Cloud

Cuando se desee migrar al cloud, el proceso es:

### Paso 1 — Backend en Railway
```bash
# railway.app — gratuito para empezar
npm install -g @railway/cli
railway login
railway init
railway up
```

### Paso 2 — Variables de entorno
```bash
# Solo cambiar el host de la base de datos
POSTGRES_HOST=db.supabase.co
NODE_ENV=production
# Deshabilitar synchronize en TypeORM
```

### Paso 3 — Frontend
```bash
# Quitar Electron, desplegar React puro en Vercel
vercel deploy apps/desktop
```

### Costo estimado inicial en cloud
| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free | $0/mes |
| Railway | Starter | ~$5/mes |
| Vercel | Free | $0/mes |
| **Total** | | **~$5/mes** |
