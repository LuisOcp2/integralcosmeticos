## Gestión de usuarios y roles

1. Ingrese con usuario ADMIN.
2. Vaya al modulo de usuarios.
3. Cree usuarios con nombre, correo, sede y rol.
4. Roles disponibles: ADMIN, SUPERVISOR, CAJERO, BODEGUERO.
5. Desactive usuarios que ya no deban ingresar al sistema.

## Configuración de sedes

1. Abra el modulo **Sedes**.
2. Registre nombre, direccion y tipo de sede.
3. Mantenga actualizadas las sedes activas para reportes correctos.

## Gestión de productos y catálogo

1. Cree categorias y marcas primero.
2. Registre productos base (nombre, precio, IVA, categoria, marca).
3. Agregue variantes (presentacion, color, talla, etc.).
4. Revise que cada variante tenga datos consistentes para inventario y ventas.

## Control de inventario y traslados

1. Use el modulo **Inventario** para entradas, salidas y ajustes.
2. Para mover stock entre sedes, use **Traslado** indicando origen y destino.
3. Verifique alertas de stock minimo y reponga oportunamente.

## Reportes y dashboard

1. Consulte Dashboard para indicadores generales.
2. En **Reportes**, aplique filtros por rango de fechas y sede.
3. Revise ventas por sede, productos mas vendidos, clientes frecuentes y cierres de caja.

## Sincronización con la nube

1. Abra **Sincronizacion** (solo ADMIN).
2. Revise estado de cola, pendientes y errores.
3. Use **Forzar Sync ahora** cuando requiera empujar datos inmediatamente.
4. Consulte el historial para auditar operaciones recientes.

## Guía de backup manual

1. Acceda al servidor con variables de entorno cargadas.
2. Ejecute:

```bash
DATABASE_URL="$SUPABASE_DB_URL" pg_dump --no-acl --no-owner -Fc "$DATABASE_URL" > backup_manual_YYYY-MM-DD.dump
```

3. Verifique que el archivo `.dump` se haya generado.
4. Copie el backup a almacenamiento externo seguro.
5. Documente fecha, responsable y resultado de la verificacion.
