import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TipoDocumento } from '../entities/documento.entity';

export class CreateDocumentoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  carpetaId: string;

  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipo: TipoDocumento;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombreArchivo: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  archivoUrl: string;

  @ApiProperty()
  @IsInt()
  tamano: number;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  mimeType: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  etiquetas?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vencimientoEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  entidadTipo?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  entidadId?: string;
}
