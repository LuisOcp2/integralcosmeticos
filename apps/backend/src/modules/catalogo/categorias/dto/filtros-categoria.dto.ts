import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FiltrosCategoriaDto {
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

  @ApiPropertyOptional({ example: 'maquillaje' })
  @IsOptional()
  @IsString()
  buscar?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 'orden:ASC', enum: ['orden:ASC', 'orden:DESC', 'nombre:ASC'] })
  @IsOptional()
  @IsIn(['orden:ASC', 'orden:DESC', 'nombre:ASC'])
  ordenamiento?: 'orden:ASC' | 'orden:DESC' | 'nombre:ASC';
}
