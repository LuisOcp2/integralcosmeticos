import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Decorador reutilizable para campos de contraseña.
 * Reglas: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 dígito, 1 carácter especial.
 */
export function EsPasswordFuerte() {
  return applyDecorators(
    IsString(),
    MinLength(8),
    MaxLength(100),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message:
        'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&)',
    }),
  );
}
