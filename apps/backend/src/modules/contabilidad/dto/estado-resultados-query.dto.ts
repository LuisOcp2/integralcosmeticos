import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class EstadoResultadosQueryDto {
  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  fechaDesde: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  fechaHasta: string;
}
