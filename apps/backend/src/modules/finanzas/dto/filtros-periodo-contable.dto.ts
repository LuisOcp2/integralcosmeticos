import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { EstadoPeriodoFinanciero } from '../entities/periodo-contable.entity';

export class FiltrosPeriodoContableDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ enum: EstadoPeriodoFinanciero })
  @IsOptional()
  @IsEnum(EstadoPeriodoFinanciero)
  estado?: EstadoPeriodoFinanciero;
}
