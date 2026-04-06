import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetFlujoCajaDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  fechaDesde: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  fechaHasta: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cuentaId?: string;
}
