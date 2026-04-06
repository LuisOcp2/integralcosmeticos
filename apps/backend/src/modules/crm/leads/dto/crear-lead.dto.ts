import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoLead, OrigenLead } from '../entities/lead.entity';

export class CrearLeadDto {
  @ApiProperty({ example: 'Camila Rojas' })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ example: 'Distribuciones CR S.A.S.' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  empresa?: string;

  @ApiPropertyOptional({ example: 'camila@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiProperty({ enum: OrigenLead, example: OrigenLead.WEB })
  @IsEnum(OrigenLead)
  origen: OrigenLead;

  @ApiPropertyOptional({ enum: EstadoLead, example: EstadoLead.NUEVO })
  @IsOptional()
  @IsEnum(EstadoLead)
  estado?: EstadoLead;

  @ApiPropertyOptional({ example: 1250000.5 })
  @IsOptional()
  @Type(() => Number)
  valorEstimado?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probabilidad?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  asignadoAId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  sedeId: string;

  @ApiPropertyOptional({ example: 'Solicita contacto por WhatsApp en horario PM.' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ example: 'Precio fuera del presupuesto' })
  @IsOptional()
  @IsString()
  motivoPerdida?: string;

  @ApiPropertyOptional({ example: '2026-04-12' })
  @IsOptional()
  @IsDateString()
  fechaProximoContacto?: string;
}
