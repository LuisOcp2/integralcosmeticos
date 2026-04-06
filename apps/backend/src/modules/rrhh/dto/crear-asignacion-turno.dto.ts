import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CrearAsignacionTurnoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  empleadoId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  turnoId: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  fechaDesde: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;
}
