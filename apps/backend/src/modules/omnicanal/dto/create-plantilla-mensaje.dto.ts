import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CanalOmnicanal } from '../entities/conversacion.entity';
import { CategoriaPlantillaMensaje } from '../entities/plantilla-mensaje.entity';

export class CreatePlantillaMensajeDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ enum: CanalOmnicanal })
  @IsEnum(CanalOmnicanal)
  canal: CanalOmnicanal;

  @ApiProperty({ enum: CategoriaPlantillaMensaje })
  @IsEnum(CategoriaPlantillaMensaje)
  categoria: CategoriaPlantillaMensaje;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  asunto?: string;

  @ApiProperty()
  @IsString()
  cuerpo: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
