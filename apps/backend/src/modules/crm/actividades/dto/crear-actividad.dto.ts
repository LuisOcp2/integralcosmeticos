import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoActividadCRM } from '../entities/actividad-crm.entity';

export class CrearActividadDto {
  @ApiProperty({ enum: TipoActividadCRM })
  @IsEnum(TipoActividadCRM)
  tipo: TipoActividadCRM;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  leadId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  oportunidadId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clienteId?: string;

  @ApiProperty({ example: 'Seguimiento comercial semanal' })
  @IsString()
  @MaxLength(200)
  asunto: string;

  @ApiPropertyOptional({ example: 'Se agenda reunion con compras para validar volumen.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'Interes confirmado para siguiente ciclo.' })
  @IsOptional()
  @IsString()
  resultado?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duracionMinutos?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  realizadoPorId?: string;

  @ApiProperty({ example: '2026-04-06T15:30:00.000Z' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  completada?: boolean;

  @ApiPropertyOptional({ example: 'Enviar propuesta final el viernes.' })
  @IsOptional()
  @IsString()
  proximaAccion?: string;

  @ApiPropertyOptional({ example: '2026-04-09' })
  @IsOptional()
  @IsDateString()
  fechaProximaAccion?: string;
}
