import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CrearPedidoDto } from './crear-pedido.dto';
import { EstadoPedido } from '../entities/pedido.entity';

export class ActualizarPedidoDto extends PartialType(CrearPedidoDto) {
  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;
}
