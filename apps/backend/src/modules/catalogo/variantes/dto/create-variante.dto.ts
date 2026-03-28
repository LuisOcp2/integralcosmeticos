import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVarianteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ example: 'Tono Nude 01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({
    example: '7701234567890',
    description: 'Si no se envia, el sistema genera EAN-13 automaticamente',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  codigoBarras?: string;

  @ApiPropertyOptional({
    example: 'BASE-HD-NUDE-01',
    description: 'Si no se envia, el sistema genera un SKU corto automaticamente',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioExtra: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioVenta?: number;

  @ApiProperty({ example: 28000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto?: number;

  @ApiProperty({ example: 'https://cdn.ejemplo.com/variantes/base-hd-01.png', required: false })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'imagenUrl debe ser una URL valida' })
  imagenUrl?: string;
}
