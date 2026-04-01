import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Transform } from 'class-transformer';
import { EsPasswordFuerte } from '../../../common/decorators/password-fuerte.decorator';

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
    example: 'Admin2026!',
    description: 'Mínimo 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 especial (@$!%*?&)',
  })
  @EsPasswordFuerte()
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
