import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarPasswordDto {
  @ApiProperty({ description: 'Contrasena actual' })
  @IsString()
  passwordActual: string;

  @ApiProperty({ description: 'Nueva contrasena (min 8, 1 mayus, 1 numero, 1 especial)' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'La nueva contrasena debe tener al menos 1 mayuscula, 1 numero y 1 caracter especial',
  })
  passwordNuevo: string;
}
