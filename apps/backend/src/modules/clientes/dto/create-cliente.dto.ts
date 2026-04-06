import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento } from '@cosmeticos/shared-types';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.CC })
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @ApiProperty({ example: '1032456789' })
  @IsString()
  @Length(1, 20)
  numeroDocumento: string;

  @ApiProperty({ example: 'Luisa' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Martinez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ example: 'luisa@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  @Length(1, 20)
  telefono?: string;

  @ApiPropertyOptional({ example: '3101234567' })
  @IsString()
  @IsOptional()
  @Length(1, 20)
  celular?: string;

  @ApiPropertyOptional({ example: '1998-05-09' })
  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ enum: ['M', 'F', 'OTRO'], example: 'F' })
  @IsOptional()
  @IsIn(['M', 'F', 'OTRO'])
  genero?: 'M' | 'F' | 'OTRO';

  @ApiPropertyOptional({ example: 'Cra 10 # 12-34' })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Bogota' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: 'Cundinamarca' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  departamento?: string;

  @ApiPropertyOptional({ example: 'Cliente preferencial' })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sedeRegistroId?: string;
}
