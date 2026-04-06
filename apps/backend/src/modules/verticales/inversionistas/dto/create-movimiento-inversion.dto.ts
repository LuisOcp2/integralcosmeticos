import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoMovimientoInversion } from '../entities/movimiento-inversion.entity';

export class CreateMovimientoInversionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: TipoMovimientoInversion })
  @IsEnum(TipoMovimientoInversion)
  tipo: TipoMovimientoInversion;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monto: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  cantidadUnidades?: number;

  @ApiProperty()
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nota?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  registradoPorId: string;
}
