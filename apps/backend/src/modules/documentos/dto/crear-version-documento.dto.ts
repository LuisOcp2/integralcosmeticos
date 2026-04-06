import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearVersionDocumentoDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombreArchivo: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  archivoUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cambios?: string;
}
