import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoriaMovimientoBancario } from '../entities/movimiento-bancario.entity';

export class RegistrarEgresoDto {
  @ApiProperty({ example: 80000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({ enum: CategoriaMovimientoBancario })
  @IsEnum(CategoriaMovimientoBancario)
  categoria: CategoriaMovimientoBancario;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @ApiPropertyOptional({ example: '2026-04-06' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ordenCompraId?: string;
}
