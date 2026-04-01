import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

export class CreateUsuarioAdminDto extends OmitType(CreateUsuarioDto, ['password'] as const) {
  @ApiPropertyOptional({ example: '3201239876' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({
    example: 'PasswordTemp123',
    description: 'Si se omite, se genera automaticamente una temporal',
  })
  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}
