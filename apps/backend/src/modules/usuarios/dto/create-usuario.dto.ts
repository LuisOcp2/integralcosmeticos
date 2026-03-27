import { IsEmail, IsEnum, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  apellido: string;

  @ApiProperty({ example: 'juan@cosmeticos.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Rol, example: Rol.CAJERO })
  @IsEnum(Rol)
  rol: Rol;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sedeId?: string;
}
