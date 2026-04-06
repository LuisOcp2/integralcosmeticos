import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FiltrosProductoDto } from './filtros-producto.dto';

export class ProductosQueryDto extends FiltrosProductoDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @ApiPropertyOptional({ example: 'base' })
  @IsOptional()
  @IsString()
  q?: string;
}
