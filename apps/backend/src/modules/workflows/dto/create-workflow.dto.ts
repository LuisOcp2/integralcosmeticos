import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AccionWorkflowTipo, TriggerWorkflowTipo } from '../entities/workflow.entity';

class TriggerWorkflowDto {
  @ApiProperty({ enum: TriggerWorkflowTipo })
  @IsEnum(TriggerWorkflowTipo)
  tipo: TriggerWorkflowTipo;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  configuracion?: Record<string, unknown>;
}

class PasoWorkflowDto {
  @ApiProperty({ enum: AccionWorkflowTipo })
  @IsEnum(AccionWorkflowTipo)
  tipo: AccionWorkflowTipo;

  @ApiProperty({ type: Object })
  @IsObject()
  config: Record<string, unknown>;
}

export class CreateWorkflowDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ type: TriggerWorkflowDto })
  @ValidateNested()
  @Type(() => TriggerWorkflowDto)
  trigger: TriggerWorkflowDto;

  @ApiProperty({ type: [PasoWorkflowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasoWorkflowDto)
  pasos: PasoWorkflowDto[];
}
