import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTipoDocumentoDto {
  @ApiProperty({ example: 'CE' })
  @IsString()
  @Length(1, 20)
  codigo: string;

  @ApiProperty({ example: 'Cedula de Extranjeria' })
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Documento para extranjeros residentes' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
