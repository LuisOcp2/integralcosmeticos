import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PlanEmpresa } from '../entities/empresa.entity';

export class CambiarPlanDto {
  @ApiProperty({ enum: PlanEmpresa })
  @IsEnum(PlanEmpresa)
  plan: PlanEmpresa;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  vencimientoEn?: string;
}
