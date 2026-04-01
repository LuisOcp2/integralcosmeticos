import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permiso } from '@cosmeticos/shared-types';

export class GestionarPermisosDto {
  @ApiProperty({
    type: [String],
    enum: Permiso,
    isArray: true,
    description: 'Permisos extras a AGREGAR sobre el rol',
  })
  @IsArray()
  @IsEnum(Permiso, { each: true })
  permisosExtra: Permiso[];

  @ApiProperty({
    type: [String],
    enum: Permiso,
    isArray: true,
    description: 'Permisos a REVOCAR del rol base',
  })
  @IsArray()
  @IsEnum(Permiso, { each: true })
  permisosRevocados: Permiso[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}
