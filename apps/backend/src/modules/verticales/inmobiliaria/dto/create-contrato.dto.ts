import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateContratoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inmuebleId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  arrendatarioId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  propietarioId: string;

  @ApiProperty()
  @IsDateString()
  fechaInicio: string;

  @ApiProperty()
  @IsDateString()
  fechaFin: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  duracionMeses: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  canonMensual: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  deposito: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  incrementoPorcentaje?: number;
}
