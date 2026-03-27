# 🚀 Guía de Instalación

## Requisitos Previos

| Herramienta    | Versión mínima | Descarga                             |
| -------------- | -------------- | ------------------------------------ |
| Node.js        | >= 20.0.0      | [nodejs.org](https://nodejs.org)     |
| npm            | >= 10.0.0      | Incluido con Node.js                 |
| Docker Desktop | >= 4.0         | [docker.com](https://www.docker.com) |
| Git            | >= 2.40        | [git-scm.com](https://git-scm.com)   |

---

## Instalación Paso a Paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/LuisOcp2/integralcosmeticos.git
cd integralcosmeticos
```

### 2. Instalar dependencias del monorepo

```bash
npm install
```

### 3. Levantar la infraestructura Docker

```bash
docker-compose up -d
```

Verificar que estén corriendo:

```bash
docker-compose ps
```

### 4. Configurar variables de entorno del backend

```bash
cp apps/backend/.env.example apps/backend/.env.local
```

Editar `apps/backend/.env.local` si es necesario (los valores por defecto funcionan con Docker Compose).

### 5. Iniciar el backend

```bash
cd apps/backend
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### 6. Crear el usuario administrador inicial

```bash
curl -X POST http://localhost:3000/api/v1/usuarios/seed
```

Credenciales del admin:

- **Email:** admin@cosmeticos.com
- **Password:** Admin2026!

### 7. Iniciar el frontend (nueva terminal)

```bash
cd apps/desktop
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

---

## Verificación de la Instalación

### ✅ Backend funcionando

```bash
curl http://localhost:3000/api/v1/health
# Respuesta esperada:
# {"status":"ok","app":"Integral Cosméticos API",...}
```

### ✅ Login funcionando

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cosmeticos.com", "password": "Admin2026!"}'
# Respuesta esperada: {"accessToken": "eyJ..."}
```

### ✅ Swagger disponible

Abrir en navegador: `http://localhost:3000/api/docs`

### ✅ pgAdmin disponible

Abrir en navegador: `http://localhost:5050`

- Email: `admin@integralcosmeticos.com`
- Password: `admin2026`

---

## Solución de Problemas Comunes

### Error: Puerto 5432 ya ocupado

```bash
# Ver qué usa el puerto
sudo lsof -i :5432
# Cambiar el puerto en docker-compose.yml
# ports: - '5433:5432'
```

### Error: `Cannot find module 'dist/main'`

```bash
# Asegurarse de usar el script correcto
npm run dev  # usa ts-node-dev, NO compila a dist/
```

### Error: `TS2564 strictPropertyInitialization`

```bash
# Verificar que tsconfig.json del backend tenga:
# "strictPropertyInitialization": false
```

### Error: Puerto de pgAdmin ya ocupado

```bash
# El puerto 8080 puede estar ocupado
# En docker-compose.yml cambiar:
# ports: - '5050:80'
```

### PostgreSQL no conecta

```bash
# Verificar que el contenedor esté healthy
docker-compose ps
# Si está 'starting', esperar unos segundos y reintentar
docker-compose restart postgres
```

---

## Scripts Disponibles

### Raíz del monorepo

```bash
npm run dev      # Corre todos los apps en paralelo (Turborepo)
npm run build    # Build de producción
npm run lint     # Linting en todos los packages
npm run format   # Prettier en todo el proyecto
```

### Backend (`apps/backend`)

```bash
npm run dev         # ts-node-dev con hot reload
npm run dev:nest    # nest start --watch (requiere nest CLI global)
npm run build       # Compila a dist/
npm run test        # Tests unitarios con Jest
npm run lint        # ESLint
```

### Frontend (`apps/desktop`)

```bash
npm run dev              # Vite dev server
npm run electron:dev     # React + Electron en desarrollo
npm run electron:build   # Build instalador .exe
npm run build            # Build web
```

---

## Verificación de Sync y seguridad global

### Probar estado de sincronización

Con un token ADMIN válido:

```bash
curl http://localhost:3000/api/sync/status \
  -H "Authorization: Bearer <JWT_TOKEN_ADMIN>"
```

### Forzar sincronización manual

```bash
curl -X POST http://localhost:3000/api/sync/forzar \
  -H "Authorization: Bearer <JWT_TOKEN_ADMIN>"
```

### Confirmar protección HTTP base

- Helmet habilitado (cabeceras de seguridad HTTP).
- CORS habilitado para el frontend configurado.
- Throttling global activo vía `ThrottlerGuard`.
- Validación global activa con `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).
