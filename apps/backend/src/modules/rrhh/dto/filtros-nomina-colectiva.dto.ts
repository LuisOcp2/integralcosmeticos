import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { EstadoNominaColectiva } from '../nomina/entities/nomina-colectiva.entity';

export class FiltrosNominaColectivaDto {
  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sedeId?: string;

  @ApiPropertyOptional({ enum: EstadoNominaColectiva })
  @IsOptional()
  @IsEnum(EstadoNominaColectiva)
  estado?: EstadoNominaColectiva;
}
