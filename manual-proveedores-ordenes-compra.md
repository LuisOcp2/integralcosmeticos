# Manual de Uso: Módulo de Proveedores y Órdenes de Compra

## Introducción

Este manual describe cómo usar el módulo de proveedores y órdenes de compra recientemente implementado en el Sistema Integral Cosméticos. El módulo permite gestionar proveedores, crear órdenes de compra y generar documentos PDF oficiales.

## Acceso al Módulo

Para acceder al módulo:

1. Inicie sesión en el sistema con credenciales válidas
2. Navegue al menú lateral y seleccione "Proveedores" o "Órdenes de Compra"
3. Dependiendo de su rol (ADMIN, SUPERVISOR, BODEGUERO), tendrá diferentes niveles de acceso

## Gestión de Proveedores

### Crear un Nuevo Proveedor

1. Haga clic en el botón "+ Nuevo Proveedor" en la página de proveedores
2. Complete el formulario con:
   - Razón Social (nombre comercial del proveedor)
   - Número de Documento Legal (NIT, cédula, etc. - opcional pero recomendado)
   - Teléfono de contacto
   - Dirección de correo electrónico
   - Dirección física
3. Haga clic en "Guardar" para crear el proveedor
4. El proveedor aparecerá en la lista con estado "Activo" por defecto

### Editar un Proveedor Existente

1. Localice el proveedor en la lista
2. Haga clic en el icono de lápiz (✏️) en la fila del proveedor
3. Modifique los campos necesarios en el formulario que se abre
4. Haga clic en "Actualizar" para guardar los cambios

### Desactivar/Activar Proveedores

1. Localice el proveedor en la lista
2. Use el interruptor de estado en la columna "Estado" para activar/desactivar
3. Los proveedores desactivados no podrán ser seleccionados al crear órdenes de compra

## Gestión de Órdenes de Compra

### Crear una Nueva Orden de Compra

1. Haga clic en el botón "+ Nueva Orden" en la página de órdenes de compra
2. Complete el formulario con:
   - Proveedor: Seleccione un proveedor de la lista desplegable (solo muestra proveedores activos)
   - Fecha de Entrega Esperada: Seleccione la fecha estimada de llegada de la mercancía
3. Haga clic en "Guardar" para crear la orden
4. La orden se creará con estado "Pendiente" por defecto

### Actualizar el Estado de una Orden

1. Localice la orden en la lista
2. Haga clic en el badge de estado para cambiarlo:
   - Pendiente → Aprobada (cuando se autoriza la compra)
   - Aprobada → Recibida (cuando llega la mercancía)
   - Cualquier estado → Cancelada (si se cancela la orden)
3. El sistema actualizará automáticamente el estado y mostrará una confirmación

### Ver Detalles de una Orden

1. Haga clic en el icono de ojo (👁️) en la fila de la orden
2. Se mostrará una vista detallada con:
   - Información completa de la orden
   - Datos del proveedor asociado
   - Historial de cambios de estado

### Generar PDF de la Orden

1. Localice la orden en la lista
2. Haga clic en el icono de descarga PDF (📄) en la fila de la orden
3. El sistema generará y descargará automáticamente un PDF con:
   - Encabezado con los datos de su empresa
   - Información completa de la orden
   - Detalles del proveedor
   - Número de orden único
   - Fecha de creación y estado actual
   - Pie de página con información legal

## Flujo de Trabajo Recomendado

1. **Registro de Proveedores**: Mantenga actualizada su lista de proveedores activos
2. **Solicita Cotizaciones**: Obtenga precios y condiciones de sus proveedores
3. **Crear Orden**: Cuando decida comprar, cree una orden de compra
4. **Aprobar Orden**: Cambie el estado a "Aprobada" después de obtener autorización interna
5. **Recibir Mercancía**: Cuando llegue el producto, cambie el estado a "Recibida"
6. **Archivar Documento**: Descargue y guarde el PDF para su contabilidad y auditoría

## Consideraciones Importantes

- Solo los usuarios con roles ADMIN, SUPERVISOR o BODEGUERO pueden crear y modificar órdenes de compra
- Los proveedores deben estar activos para aparecer en el selector al crear órdenes
- El número de documento legal del proveedor es opcional pero altamente recomendado para fines tributarios
- Cada orden de compra recibe un número único automáticamente generado
- Los PDFs generados siguen los estándares de diseño del sistema para mantener coherencia visual

## Solución de Problemas Comunes

**Problema**: No puedo ver ciertos proveedores al crear una orden
**Solución**: Verifique que el proveedor esté marcado como "Activo" en la lista de proveedores

**Problema**: El botón de generar PDF no funciona
**Solución**: Asegúrese de tener conexión al servidor y que no haya errores en la consola del navegador

**Problema**: No puedo cambiar el estado de una orden
**Solución**: Verifique que tenga los permisos necesarios (rol ADMIN, SUPERVISOR o BODEGUERO)

## Soporte Técnico

Para cualquier problema o consulta adicional sobre este módulo, contacte al departamento de sistemas de su organización o consulte la documentación técnica completa disponible en el repositorio del proyecto.
