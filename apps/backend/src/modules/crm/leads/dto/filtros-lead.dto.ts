import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { EstadoLead, OrigenLead } from '../entities/lead.entity';

export class FiltrosLeadDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'camila distribuciones' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: EstadoLead })
  @IsOptional()
  @IsEnum(EstadoLead)
  estado?: EstadoLead;

  @ApiPropertyOptional({ enum: OrigenLead })
  @IsOptional()
  @IsEnum(OrigenLead)
  origen?: OrigenLead;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  asignadoAId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  sedeId?: string;
}
