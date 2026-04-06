import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  CategoriaMovimientoBancario,
  TipoMovimientoBancario,
} from '../entities/movimiento-bancario.entity';

export class FiltrosMovimientoBancarioDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cuentaBancariaId?: string;

  @ApiPropertyOptional({ enum: TipoMovimientoBancario })
  @IsOptional()
  @IsEnum(TipoMovimientoBancario)
  tipo?: TipoMovimientoBancario;

  @ApiPropertyOptional({ enum: CategoriaMovimientoBancario })
  @IsOptional()
  @IsEnum(CategoriaMovimientoBancario)
  categoria?: CategoriaMovimientoBancario;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  conciliado?: boolean;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
