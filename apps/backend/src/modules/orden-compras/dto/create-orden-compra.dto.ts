import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const UUID_FORMAT_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateDetalleOrdenCompraDto {
  @ApiProperty({ format: 'uuid' })
  @Matches(UUID_FORMAT_REGEX, { message: 'varianteId must be a UUID' })
  varianteId: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidadPedida: number;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUnitario: number;
}

export class CreateOrdenCompraDto {
  @ApiProperty({ format: 'uuid' })
  @Matches(UUID_FORMAT_REGEX, { message: 'proveedorId must be a UUID' })
  proveedorId: string;

  @ApiProperty({ format: 'uuid' })
  @Matches(UUID_FORMAT_REGEX, { message: 'sedeId must be a UUID' })
  sedeId: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  fechaEsperada?: string;

  @ApiPropertyOptional({ example: 'Entrega parcial permitida' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [CreateDetalleOrdenCompraDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleOrdenCompraDto)
  detalles: CreateDetalleOrdenCompraDto[];
}
