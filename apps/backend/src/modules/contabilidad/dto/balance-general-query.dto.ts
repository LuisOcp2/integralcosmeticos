import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class BalanceGeneralQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de corte (YYYY-MM-DD). Por defecto hoy.',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
