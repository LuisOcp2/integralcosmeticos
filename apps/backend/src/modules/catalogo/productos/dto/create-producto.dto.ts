import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({ example: 'Base Liquida HD' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Base de alta cobertura' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoriaId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  marcaId: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  precioBase: number;

  @ApiProperty({ example: 28000 })
  @IsNumber()
  @Min(0)
  precioCosto: number;

  @ApiProperty({ example: 19 })
  @IsNumber()
  @Min(0)
  iva: number;
}
