import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoPeriodoFinanciero } from '../entities/periodo-contable.entity';

export class CerrarPeriodoContableDto {
  @ApiPropertyOptional({
    enum: [EstadoPeriodoFinanciero.CERRADO, EstadoPeriodoFinanciero.BLOQUEADO],
  })
  @IsOptional()
  @IsEnum(EstadoPeriodoFinanciero)
  estado?: EstadoPeriodoFinanciero;
}
