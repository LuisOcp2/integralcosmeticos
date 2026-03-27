import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento } from '@cosmeticos/shared-types';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ example: 'Luisa' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Martinez' })
  @IsString()
  apellido: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.CC })
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @ApiProperty({ example: '1032456789' })
  @IsString()
  @Length(5, 30)
  documento: string;

  @ApiPropertyOptional({ example: 'luisa@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Cra 10 # 12-34' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: '1998-05-09' })
  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;
}
