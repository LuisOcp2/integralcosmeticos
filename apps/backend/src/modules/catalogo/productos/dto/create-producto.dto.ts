import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
  @MaxLength(5000)
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
  precio: number;

  @ApiPropertyOptional({ example: 45000, deprecated: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase?: number;

  @ApiPropertyOptional({ example: 28000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCompra?: number;

  @ApiPropertyOptional({ example: 28000, deprecated: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioCosto?: number;

  @ApiPropertyOptional({ example: 19 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  impuesto?: number;

  @ApiPropertyOptional({ example: 19, deprecated: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  iva?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  permitirVentaSinStock?: boolean;
}
