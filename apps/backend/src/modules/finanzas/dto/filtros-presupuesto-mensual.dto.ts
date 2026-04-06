import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TipoPresupuestoMensual } from '../entities/presupuesto-mensual.entity';

export class FiltrosPresupuestoMensualDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  periodoId?: string;

  @ApiPropertyOptional({ enum: TipoPresupuestoMensual })
  @IsOptional()
  @IsEnum(TipoPresupuestoMensual)
  tipo?: TipoPresupuestoMensual;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano?: number;
}
