import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoPedido } from '../entities/pedido.entity';

export class CambiarEstadoPedidoDto {
  @ApiProperty({ enum: EstadoPedido })
  @IsEnum(EstadoPedido)
  estado: EstadoPedido;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nota?: string;
}
