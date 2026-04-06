import { PartialType } from '@nestjs/swagger';
import { CrearDetalleCotizacionDto } from './crear-detalle-cotizacion.dto';

export class ActualizarDetalleCotizacionDto extends PartialType(CrearDetalleCotizacionDto) {}
