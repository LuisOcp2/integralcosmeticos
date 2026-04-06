import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CategoriaNotificacion } from '../entities/notificacion.entity';

export class UpdateConfiguracionNotificacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  silenciadoHasta?: string | null;

  @ApiPropertyOptional({ enum: CategoriaNotificacion, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CategoriaNotificacion, { each: true })
  categoriasDesactivadas?: CategoriaNotificacion[];
}
