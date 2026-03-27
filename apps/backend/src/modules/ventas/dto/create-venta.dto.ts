import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@cosmeticos/shared-types';
import {
  ArrayMinSize,
  IsDefined,
  IsArray,
  IsEnum,
  IsNumber,
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
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuentoItem?: number;
}

class SplitPagoDto {
  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0)
  efectivo: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  tarjeta: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  transferencia: number;
}

export class CreateVentaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @ApiProperty({ enum: MetodoPago, example: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiPropertyOptional({ example: 'Venta con redencion de puntos' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;

  @ApiPropertyOptional({ type: SplitPagoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SplitPagoDto)
  splitPago?: SplitPagoDto;

  @ApiProperty({ type: [CreateDetalleVentaDto] })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  items: CreateDetalleVentaDto[];
}

export { CreateDetalleVentaDto };
