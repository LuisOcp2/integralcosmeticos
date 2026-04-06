import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoProyecto, PrioridadProyecto, TipoProyecto } from '../entities/proyecto.entity';

export class CreateProyectoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ enum: TipoProyecto })
  @IsEnum(TipoProyecto)
  tipo: TipoProyecto;

  @ApiPropertyOptional({ enum: EstadoProyecto })
  @IsOptional()
  @IsEnum(EstadoProyecto)
  estado?: EstadoProyecto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsableId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiProperty()
  @IsDateString()
  fechaInicio: string;

  @ApiProperty()
  @IsDateString()
  fechaFinEsperada: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFinReal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  presupuesto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoActual?: number;

  @ApiPropertyOptional({ enum: PrioridadProyecto })
  @IsOptional()
  @IsEnum(PrioridadProyecto)
  prioridad?: PrioridadProyecto;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeAvance?: number;
}
