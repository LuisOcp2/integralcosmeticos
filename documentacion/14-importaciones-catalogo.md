# Importaciones Masivas de Catalogo (CSV y XLSX)

Documento de contrato funcional y tecnico para cargas iniciales e importaciones masivas de productos y variantes.

## Objetivo

- Permitir carga masiva por archivo `.csv` y `.xlsx`.
- Evitar duplicados y errores operativos en catalogo.
- Tener proceso auditable, idempotente y seguro.

## Formatos soportados

- `.csv` (UTF-8, delimitador `;` recomendado; tambien `,`)
- `.xlsx` (hoja 1 por defecto)

Ambos formatos se transforman al mismo modelo canonico antes de validar/aplicar.

## Flujo recomendado

1. Subir archivo.
2. Validar en `dry-run` (sin escribir en tablas finales).
3. Revisar resumen y errores por fila.
4. Confirmar ejecucion real.
5. Descargar reporte final (creados/actualizados/error/saltados).

## Endpoints propuestos

- `POST /catalogo/importaciones/archivo`
  - Crea job y registra metadata del archivo.
- `POST /catalogo/importaciones/:jobId/validar?dryRun=true`
  - Ejecuta validaciones y previsualizacion.
- `POST /catalogo/importaciones/:jobId/ejecutar`
  - Aplica cambios (upsert por lotes).
- `GET /catalogo/importaciones/:jobId/estado`
  - Estado, progreso y metricas.
- `GET /catalogo/importaciones/:jobId/reporte`
  - Errores y resultados por fila.
- `GET /catalogo/importaciones/plantilla?format=csv|xlsx`
  - Descarga plantilla oficial v1.

Acceso: solo `ADMIN`.

## Plantilla oficial v1 (columnas)

### Producto

| Columna               | Tipo       | Req      | Regla                     |
| --------------------- | ---------- | -------- | ------------------------- |
| `codigoInterno`       | string     | opcional | Unico; si vacio se genera |
| `nombreProducto`      | string     | si       | Max 200                   |
| `descripcionProducto` | string     | opcional | Max 2500                  |
| `imagenProductoUrl`   | string/url | opcional | URL valida                |
| `categoria`           | string     | si       | Nombre exacto o resoluble |
| `marca`               | string     | si       | Nombre exacto o resoluble |
| `precioVentaProducto` | decimal    | si       | >= 0                      |
| `precioCostoProducto` | decimal    | si       | >= 0 y <= precio venta    |
| `iva`                 | decimal    | si       | 0..100                    |
| `activoProducto`      | bool       | opcional | default `true`            |

### Variante

| Columna               | Tipo       | Req      | Regla                                 |
| --------------------- | ---------- | -------- | ------------------------------------- |
| `nombreVariante`      | string     | si       | Max 200                               |
| `sku`                 | string     | opcional | Unico; si vacio se genera             |
| `codigoBarras`        | string     | opcional | 8..14 digitos; si vacio genera EAN-13 |
| `precioExtra`         | decimal    | opcional | default 0                             |
| `precioVentaVariante` | decimal    | opcional | >= 0                                  |
| `precioCostoVariante` | decimal    | opcional | >= 0 y <= precio venta variante       |
| `imagenVarianteUrl`   | string/url | opcional | URL valida                            |
| `activaVariante`      | bool       | opcional | default `true`                        |

## Reglas de resolucion y upsert

### Producto (llave de negocio)

1. Si `codigoInterno` viene informado: usar como llave primaria de upsert.
2. Si no viene `codigoInterno`: resolver por (`nombreProducto`, `categoria`, `marca`).
3. Si no existe: crear producto.
4. Si existe: actualizar segun modo de importacion.

### Variante (llave de negocio)

1. Si viene `sku`: usar `sku` como llave.
2. Si no viene `sku` y viene `codigoBarras`: usar `codigoBarras`.
3. Si no vienen ambos: generar `sku` y `codigoBarras` antes de persistir.
4. Si existe: actualizar segun modo.
5. Si no existe: crear variante asociada al producto resuelto.

## Modos de importacion

- `crear_solo`: solo crea; si existe, marca `SKIPPED`.
- `actualizar_solo`: solo actualiza; si no existe, marca `SKIPPED`.
- `crear_o_actualizar` (recomendado): idempotente.

## Validaciones por fila (minimas)

- Tipos de dato validos (numero, bool, texto).
- Relacionales validas (categoria/marca existentes).
- Reglas financieras (`costo <= venta`, IVA valido).
- Unicidad en archivo (duplicados dentro del mismo lote).
- Unicidad contra BD (SKU, barras, codigo interno).

## Estructura de respuesta de validacion (ejemplo)

```json
{
  "jobId": "uuid",
  "dryRun": true,
  "resumen": {
    "total": 1200,
    "validas": 1140,
    "conErrores": 60,
    "productosCrear": 220,
    "productosActualizar": 380,
    "variantesCrear": 300,
    "variantesActualizar": 240
  },
  "errores": [
    {
      "fila": 15,
      "codigo": "PRECIO_INVALIDO",
      "mensaje": "precioCostoProducto no puede ser mayor a precioVentaProducto"
    }
  ]
}
```

## Buenas practicas operativas

- Procesar por lotes (500-1000 filas) en cola Bull.
- Usar transaccion por lote, no por archivo completo.
- Bloquear importacion concurrente de catalogo.
- Guardar hash del archivo para trazabilidad.
- Mantener historial de jobs (usuario, fecha, modo, resultado).

## Checklist previo a ejecutar importacion real

- [ ] Dry-run sin errores bloqueantes
- [ ] Duplicados internos corregidos
- [ ] Categorias y marcas homologadas
- [ ] Regla de precios validada
- [ ] SKU y barras revisados para casos especiales
- [ ] Responsable de negocio aprueba ejecucion
