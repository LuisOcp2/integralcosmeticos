import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EtapaOportunidad } from '../entities/oportunidad.entity';

export class CambiarEtapaDto {
  @ApiProperty({ enum: EtapaOportunidad })
  @IsEnum(EtapaOportunidad)
  etapa: EtapaOportunidad;

  @ApiPropertyOptional({ example: 'Cliente solicito ajustes antes de cierre.' })
  @IsOptional()
  @IsString()
  nota?: string;
}
