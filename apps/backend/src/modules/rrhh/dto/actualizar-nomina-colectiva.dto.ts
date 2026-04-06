import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoNominaColectiva } from '../nomina/entities/nomina-colectiva.entity';

export class ActualizarNominaColectivaDto {
  @ApiPropertyOptional({ enum: EstadoNominaColectiva })
  @IsOptional()
  @IsEnum(EstadoNominaColectiva)
  estado?: EstadoNominaColectiva;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aprobadaPorId?: string;
}
