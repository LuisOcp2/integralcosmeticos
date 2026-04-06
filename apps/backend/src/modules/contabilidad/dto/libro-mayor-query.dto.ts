import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class LibroMayorQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaId: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  fechaDesde: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  fechaHasta: string;
}
