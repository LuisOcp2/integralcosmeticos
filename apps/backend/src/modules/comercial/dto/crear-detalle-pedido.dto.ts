import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CrearDetallePedidoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pedidoId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  descripcion: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 12000 })
  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiProperty({ example: 12000 })
  @IsNumber()
  @Min(0)
  subtotal: number;
}
