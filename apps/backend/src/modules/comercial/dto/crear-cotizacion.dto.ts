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

export class CrearLineaCotizacionDto {
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

export class CrearCotizacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clienteId: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  fechaVigencia: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notasCliente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminosCondiciones?: string;

  @ApiProperty({ type: [CrearLineaCotizacionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearLineaCotizacionDto)
  detalles: CrearLineaCotizacionDto[];
}
