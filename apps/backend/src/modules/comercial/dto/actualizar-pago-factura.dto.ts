import { PartialType } from '@nestjs/swagger';
import { CrearPagoFacturaDto } from './crear-pago-factura.dto';

export class ActualizarPagoFacturaDto extends PartialType(CrearPagoFacturaDto) {}
