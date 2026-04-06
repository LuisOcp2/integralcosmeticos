import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { PerfilRiesgo, TipoInversionista } from '../entities/inversionista.entity';

export class CreateInversionistaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clienteId: string;

  @ApiProperty({ enum: TipoInversionista })
  @IsEnum(TipoInversionista)
  tipoInversionista: TipoInversionista;

  @ApiProperty({ enum: PerfilRiesgo })
  @IsEnum(PerfilRiesgo)
  perfilRiesgo: PerfilRiesgo;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  montoMaximoInversion?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  documentosVerificados?: boolean;
}
