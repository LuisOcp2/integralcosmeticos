import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CrearDetallePedidoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

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
}

export class CrearPedidoDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cotizacionId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccionEntrega?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fechaEntregaEsperada?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiProperty({ type: [CrearDetallePedidoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearDetallePedidoDto)
  detalles: CrearDetallePedidoDto[];
}
