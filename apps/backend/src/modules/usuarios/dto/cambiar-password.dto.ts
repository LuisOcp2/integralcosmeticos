import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EsPasswordFuerte } from '../../../common/decorators/password-fuerte.decorator';

export class CambiarPasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  passwordActual: string;

  @ApiProperty({
    description: 'Nueva contraseña (mínimo 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 especial)',
    example: 'NuevaPass2026!',
  })
  @EsPasswordFuerte()
  passwordNuevo: string;
}
