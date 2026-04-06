import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TipoAsistencia } from '../entities/asistencia.entity';

export class CrearAsistenciaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  turnoId?: string;

  @ApiPropertyOptional({ enum: TipoAsistencia })
  @IsOptional()
  @IsEnum(TipoAsistencia)
  tipo?: TipoAsistencia;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({ example: '2026-04-06' })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
