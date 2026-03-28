import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({ example: 'Base Liquida HD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ example: 'Base de alta cobertura' })
  @IsString()
  @IsOptional()
  @MaxLength(2500)
  descripcion?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.com/productos/base-hd.png' })
  @IsUrl({ require_tld: false }, { message: 'imagenUrl debe ser una URL valida' })
  @IsOptional()
  imagenUrl?: string;

  @ApiPropertyOptional({ example: 'PROD-2026-0001' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  codigoInterno?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoriaId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  marcaId: string;

  @ApiProperty({ example: 45000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase: number;

  @ApiProperty({ example: 28000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto: number;

  @ApiProperty({ example: 19 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  iva: number;
}
