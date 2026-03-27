# 🔐 Seguridad

## Autenticación — JWT

### Flujo de Autenticación

```
1. Usuario envía email + password
        ↓
2. LocalStrategy valida credenciales contra DB
        ↓
3. bcrypt.compare() verifica el hash de la contraseña
        ↓
4. Si válido → genera JWT firmado con JWT_SECRET
        ↓
5. JWT contiene: { sub, email, rol, sedeId, iat, exp }
        ↓
6. Cliente almacena JWT en Zustand (persistido en localStorage)
        ↓
7. Cada request incluye: Authorization: Bearer <token>
        ↓
8. JwtStrategy valida el token en cada request protegido
```

### Configuración JWT

- **Algoritmo:** HS256
- **Expiración:** 8 horas (configurable en `.env`)
- **Secret:** mínimo 32 caracteres, cambiarlo en producción

---

## Autorización — Guards y Roles

### JwtAuthGuard

Verifica que el token JWT sea válido en cada request protegido.

### RolesGuard

Verifica que el rol del usuario tenga permiso para la acción:

```typescript
@Roles(Rol.ADMIN)           // solo admin
@Roles(Rol.ADMIN, Rol.SUPERVISOR)  // admin o supervisor
// Sin @Roles → cualquier usuario autenticado
```

---

## Medidas de Seguridad Implementadas

| Medida               | Herramienta                 | Estado        |
| -------------------- | --------------------------- | ------------- |
| Hash de contraseñas  | bcryptjs (salt rounds: 10)  | ✅ Activo     |
| Headers de seguridad | Helmet.js                   | ✅ Activo     |
| Validación de DTOs   | class-validator             | ✅ Activo     |
| CORS configurado     | NestJS CORS                 | ✅ Activo     |
| UUID en IDs          | PostgreSQL uuid_generate_v4 | ✅ Activo     |
| Soft delete          | campo `activo`              | ✅ Activo     |
| Rate limiting        | @nestjs/throttler           | ⏳ Fase 5     |
| HTTPS                | Certificado SSL             | ⏳ Producción |
| Auditoría de accesos | Log interceptor             | ⏳ Fase 5     |

---

## Variables de Entorno Sensibles

> ⚠️ **NUNCA** subir el archivo `.env.local` al repositorio.
> El `.gitignore` ya lo excluye.

```bash
# Cambiar obligatoriamente en producción:
JWT_SECRET=CAMBIA_ESTE_SECRETO_EN_PRODUCCION_min32chars
POSTGRES_PASSWORD=cambia_en_produccion
SUPABASE_KEY=tu-service-role-key
```

---

## Pendiente para Producción

- [ ] Activar HTTPS con certificado SSL
- [ ] Implementar rate limiting en endpoints de login
- [ ] Remover endpoint `/usuarios/seed`
- [ ] Configurar rotación de JWT secrets
- [ ] Activar logs de auditoría completos
- [ ] Revisar y actualizar dependencias (`npm audit fix`)

## Checklist Pre-Producción

- [ ] JWT_SECRET cambiado (min 64 chars, generado con crypto.randomBytes)
- [ ] NODE_ENV=production en servidor
- [ ] Swagger deshabilitado en producción
- [ ] Rate limiting configurado (100 req/min por IP)
- [ ] CORS solo permite el origen del desktop
- [ ] Helmet habilitado
- [ ] PostgreSQL con usuario de solo lectura para reportes
- [ ] Backups automáticos probados y verificados
- [ ] POST /usuarios/seed deshabilitado manualmente
- [ ] Logs de auditoría activos en todos los módulos
