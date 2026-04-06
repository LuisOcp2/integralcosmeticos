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
import {
  CategoriaMovimientoBancario,
  TipoMovimientoBancario,
} from '../entities/movimiento-bancario.entity';

export class CrearMovimientoBancarioDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaBancariaId: string;

  @ApiProperty({ example: '2026-04-06' })
  @IsDateString()
  fecha: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @ApiProperty({ enum: TipoMovimientoBancario })
  @IsEnum(TipoMovimientoBancario)
  tipo: TipoMovimientoBancario;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiPropertyOptional({ enum: CategoriaMovimientoBancario })
  @IsOptional()
  @IsEnum(CategoriaMovimientoBancario)
  categoria?: CategoriaMovimientoBancario;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ventaId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  facturaId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ordenCompraId?: string;
}
