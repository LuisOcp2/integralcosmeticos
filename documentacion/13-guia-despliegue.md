## Requisitos del servidor (Railway)

- Proyecto Railway con servicio backend Node.js.
- PostgreSQL en Supabase como base principal.
- Redis habilitado para colas Bull.
- Variables de entorno configuradas en Railway.
- Acceso a logs y metricas de despliegue.

## Variables de entorno de producción

Configurar como minimo:

- `NODE_ENV=production`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_DB_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `FRONTEND_URL`

## Deploy backend en Railway

1. Conecte el repositorio en Railway.
2. Configure comando de build y start del workspace backend.
3. Verifique que el servicio arranque sin errores.
4. Pruebe `GET /api/health` en la URL publica.

## Configurar Supabase como BD de producción

1. Cree proyecto en Supabase.
2. Obtenga credenciales de conexion y API Key.
3. Asigne `SUPABASE_DB_URL` para backups/restore.
4. Verifique conectividad desde Railway hacia Supabase.

## Build del .exe para distribuir a clientes

1. Desde el monorepo ejecute:

```bash
npm run electron:build --workspace @cosmeticos/desktop
```

2. Revise artefactos generados en `apps/desktop/release`.
3. Entregue el instalador `.exe` firmado en caso de ambiente productivo.

### Notas de electron-builder

- `appId`: `com.integralcosmeticos.app`
- `productName`: `Integral Cosméticos`
- `target` Windows: `nsis` (`x64`)
- `output`: `apps/desktop/release`
- `files`: incluye `dist/**/*`, `electron/**/*`, `node_modules/**/*`

El empaquetado espera los iconos declarados en `package.json` del desktop.

## Checklist de go-live

- [ ] Variables de entorno cargadas y validadas.
- [ ] `JWT_SECRET` robusto y no por defecto.
- [ ] Endpoint de health respondiendo.
- [ ] Sincronizacion cloud funcional.
- [ ] Backup nocturno ejecutado correctamente.
- [ ] Instalador desktop probado en Windows objetivo.
- [ ] Usuario administrador inicial creado y seed restringido.
- [ ] Monitoreo y alertas basicas activas.
- [ ] Endpoint `GET /api/sync/status` validado con rol ADMIN.
- [ ] Endpoint `POST /api/sync/forzar` validado con rol ADMIN.
