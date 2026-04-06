import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  CategoriaNotificacion,
  PrioridadNotificacion,
  TipoNotificacion,
} from '../entities/notificacion.entity';

class AccionNotificacionDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ruta?: string;
}

export class CrearNotificacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  usuarioId: string;

  @ApiProperty({ enum: TipoNotificacion })
  @IsEnum(TipoNotificacion)
  tipo: TipoNotificacion;

  @ApiProperty({ enum: CategoriaNotificacion })
  @IsEnum(CategoriaNotificacion)
  categoria: CategoriaNotificacion;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiProperty()
  @IsString()
  mensaje: string;

  @ApiPropertyOptional({ enum: PrioridadNotificacion })
  @IsOptional()
  @IsEnum(PrioridadNotificacion)
  prioridad?: PrioridadNotificacion;

  @ApiPropertyOptional({ type: AccionNotificacionDto })
  @IsOptional()
  accion?: AccionNotificacionDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  expiresAt?: string;
}
