import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';

export class CambiarRolDto {
  @ApiProperty({
    enum: Rol,
    description: 'Nuevo rol que se asignará al usuario',
    example: Rol.SUPERVISOR,
  })
  @IsEnum(Rol, { message: `El rol debe ser uno de: ${Object.values(Rol).join(', ')}` })
  rol: Rol;

  @ApiPropertyOptional({
    description: 'Motivo del cambio de rol (requerido en auditoría)',
    maxLength: 200,
    example: 'Promoción a supervisor de turno',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
