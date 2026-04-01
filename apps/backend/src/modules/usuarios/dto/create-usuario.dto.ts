import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Transform } from 'class-transformer';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nombre: string;

  @ApiProperty({ example: 'Perez', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  apellido: string;

  @ApiProperty({ example: 'juan@cosmeticos.com' })
  @IsEmail()
  @MaxLength(200)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Minimo 8 chars, 1 mayuscula, 1 numero, 1 especial',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contrasena debe tener al menos 1 mayuscula, 1 numero y 1 caracter especial (@$!%*?&)',
  })
  password: string;

  @ApiProperty({ enum: Rol, example: Rol.CAJERO })
  @IsEnum(Rol)
  rol: Rol;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sedeId?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Notas internas del administrador' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Forzar cambio de contrasena en primer login',
  })
  @IsOptional()
  @IsBoolean()
  forzarCambioPassword?: boolean;
}
