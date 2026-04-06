import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Maquillaje' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Productos para maquillaje facial' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'maquillaje' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.com/iconos/maquillaje.png' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  padreId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
