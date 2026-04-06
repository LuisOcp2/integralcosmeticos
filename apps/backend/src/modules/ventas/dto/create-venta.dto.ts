import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@cosmeticos/shared-types';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateDetalleVentaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;

  @ApiPropertyOptional({ example: 0, deprecated: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuentoItem?: number;
}

export class CreateVentaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @ApiProperty({ enum: MetodoPago, example: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiProperty({ example: 60000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoPagado?: number;

  @ApiPropertyOptional({ example: 60000, deprecated: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoRecibido?: number;

  @ApiPropertyOptional({ example: 'Venta con redencion de puntos' })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiPropertyOptional({ example: 'Venta con redencion de puntos', deprecated: true })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ example: 0, deprecated: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;

  @ApiPropertyOptional({ format: 'uuid', deprecated: true })
  @IsUUID()
  @IsOptional()
  sedeId?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsObject()
  @IsOptional()
  splitPago?: Record<string, number>;

  @ApiProperty({ type: [CreateDetalleVentaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  items: CreateDetalleVentaDto[];
}

export { CreateDetalleVentaDto };
