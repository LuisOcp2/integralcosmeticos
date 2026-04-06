import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AccesoCarpetaDocumento } from '../entities/carpeta-documento.entity';

export class CreateCarpetaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  padreId?: string;

  @ApiPropertyOptional({ enum: AccesoCarpetaDocumento })
  @IsOptional()
  @IsEnum(AccesoCarpetaDocumento)
  acceso?: AccesoCarpetaDocumento;
}
