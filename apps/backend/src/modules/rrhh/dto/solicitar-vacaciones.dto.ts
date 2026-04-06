import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class SolicitarVacacionesDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  empleadoId: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsDateString()
  fechaFin: string;
}
