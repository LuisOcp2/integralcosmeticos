import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CanalOmnicanal, EstadoConversacion } from '../entities/conversacion.entity';

export class InboxQueryDto {
  @ApiPropertyOptional({ enum: CanalOmnicanal })
  @IsOptional()
  @IsEnum(CanalOmnicanal)
  canal?: CanalOmnicanal;

  @ApiPropertyOptional({ enum: EstadoConversacion })
  @IsOptional()
  @IsEnum(EstadoConversacion)
  estado?: EstadoConversacion;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  asignadoAId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
