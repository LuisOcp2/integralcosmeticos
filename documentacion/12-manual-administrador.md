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

### Flujo recomendado de creación (100% operativo)

1. Cree o valide **categorias** y **marcas** activas.
2. Cree el **producto base** con:
   - nombre
   - categoria y marca
   - precio base de venta
   - precio costo
   - IVA
3. Valide que el precio costo no supere el precio base.
4. En el modal de variantes del producto, registre cada variante con:
   - nombre comercial de variante
   - SKU (manual o autogenerado)
   - codigo de barras (escaneado o autogenerado EAN-13)
   - precio extra (si aplica)
   - precio venta/precio costo especificos (opcionales)
5. Si el proveedor ya trae codigo de barras, use lector USB sobre el campo de barras.
6. Si no trae codigo de barras, deje el campo vacio para generacion automatica EAN-13.
7. Si no define SKU, use generacion automatica de SKU corto para operacion rapida.
8. Si la variante no tiene precio de venta propio, el sistema calcula:
   - `precio_venta_variante = precio_base_producto + precio_extra`
9. Verifique margen por producto y por variante antes de publicar cambios.

### Reglas de validación y seguridad del catálogo

- No se permiten productos duplicados activos por combinación `nombre + categoria + marca`.
- `codigoInterno` de producto es único; si no se envía, se genera automáticamente.
- `sku` y `codigoBarras` de variantes deben ser únicos (entre variantes activas).
- El SKU autogenerado usa prefijos mnemotecnicos por negocio:
  - 3 letras de marca + 3 de categoria + 2 de producto + 2 de variante + consecutivo de 3 digitos.
  - Ejemplo: `LORMAQBAAB001`.
- Las búsquedas del catálogo soportan texto libre y consideran:
  - nombre de producto
  - nombre de categoría
  - nombre de marca
  - código interno
  - SKU
  - código de barras
- Desactivar producto o variante aplica **borrado lógico** (no se pierde histórico).

### Operación diaria recomendada

1. Filtre por categoría, marca o búsqueda global antes de editar.
2. Edite primero el producto base cuando cambie la estrategia de precio.
3. Edite variantes para ajustes puntuales de presentación o tono.
4. Use códigos de barras en POS para validar que el producto correcto esté disponible.
5. Revise semanalmente variantes sin rotación y desactive las inactivas comercialmente.

### Importaciones masivas (CSV/XLSX)

1. Ingrese al modulo **Importaciones** (solo ADMIN).
2. Descargue plantilla oficial (`CSV` o `XLSX`) desde el modulo.
3. Cargue archivo y seleccione modo:
   - `crear_solo`
   - `actualizar_solo`
   - `crear_o_actualizar` (recomendado)
4. Ejecute primero con `dry-run` para validar errores por fila.
5. Corrija filas con error y vuelva a validar.
6. Si el resultado es correcto, ejecute importacion real.
7. Monitoree progreso del job y revise reporte por fila.

Buenas practicas:

- No ejecutar dos importaciones de catalogo simultaneas.
- Homologar nombres de categoria y marca antes de importar.
- Usar `crear_o_actualizar` para procesos idempotentes.
- Conservar reportes de importacion para auditoria.

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
