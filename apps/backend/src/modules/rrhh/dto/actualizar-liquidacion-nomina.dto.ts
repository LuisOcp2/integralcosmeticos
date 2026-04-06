import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { EstadoLiquidacionNomina } from '../nomina/entities/liquidacion-nomina.entity';

export class ActualizarLiquidacionNominaDto {
  @ApiPropertyOptional({ enum: EstadoLiquidacionNomina })
  @IsOptional()
  @IsEnum(EstadoLiquidacionNomina)
  estado?: EstadoLiquidacionNomina;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retencionFuente?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otrasDeduciones?: number;
}
