import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ReportesQueryDto {
  @ApiPropertyOptional({ description: 'ID de sede para filtrar', format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  sedeId?: string;

  @ApiPropertyOptional({ description: 'Fecha inicial (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha final (YYYY-MM-DD)', example: '2026-01-31' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
