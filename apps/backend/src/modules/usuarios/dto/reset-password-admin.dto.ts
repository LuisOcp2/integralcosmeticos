import { IsString, MinLength, MaxLength, Matches, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordAdminDto {
  @ApiProperty({ description: 'Nueva contrasena temporal' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Contrasena invalida',
  })
  passwordNuevo: string;

  @ApiPropertyOptional({ default: true, description: 'Forzar cambio en proximo login' })
  @IsOptional()
  @IsBoolean()
  forzarCambio?: boolean;

  @ApiPropertyOptional({ description: 'Motivo del reset (se guarda en auditoria)' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
