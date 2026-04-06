import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { EstadoOrdenCompra } from '../entities/orden-compra.entity';

const UUID_FORMAT_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrdenesCompraQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'oc-2026 proveedor' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Matches(UUID_FORMAT_REGEX, { message: 'proveedorId must be a UUID' })
  proveedorId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Matches(UUID_FORMAT_REGEX, { message: 'sedeId must be a UUID' })
  sedeId?: string;

  @ApiPropertyOptional({ enum: EstadoOrdenCompra })
  @IsOptional()
  @IsEnum(EstadoOrdenCompra)
  estado?: EstadoOrdenCompra;
}
