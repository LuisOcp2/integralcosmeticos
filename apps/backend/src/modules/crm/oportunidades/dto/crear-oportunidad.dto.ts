import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EtapaOportunidad } from '../entities/oportunidad.entity';

export class CrearOportunidadDto {
  @ApiProperty({ example: 'Cierre distribuidores zona norte' })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  leadId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clienteId?: string;

  @ApiPropertyOptional({ enum: EtapaOportunidad, example: EtapaOportunidad.PROSPECTO })
  @IsOptional()
  @IsEnum(EtapaOportunidad)
  etapa?: EtapaOportunidad;

  @ApiProperty({ example: 4800000 })
  @Type(() => Number)
  valor: number;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probabilidad: number;

  @ApiProperty({ example: '2026-05-30' })
  @IsDateString()
  fechaCierreEsperada: string;

  @ApiPropertyOptional({ example: '2026-06-02' })
  @IsOptional()
  @IsDateString()
  fechaCierreReal?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  asignadoAId: string;

  @ApiPropertyOptional({ example: 'Oportunidad de recompra para temporada escolar.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'No se logro acuerdo en descuentos.' })
  @IsOptional()
  @IsString()
  motivoPerdida?: string;
}
