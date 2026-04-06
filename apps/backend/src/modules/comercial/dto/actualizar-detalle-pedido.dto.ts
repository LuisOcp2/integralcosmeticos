import { PartialType } from '@nestjs/swagger';
import { CrearDetallePedidoDto } from './crear-detalle-pedido.dto';

export class ActualizarDetallePedidoDto extends PartialType(CrearDetallePedidoDto) {}
