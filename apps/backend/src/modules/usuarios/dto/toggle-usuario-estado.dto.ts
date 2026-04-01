import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleUsuarioEstadoDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  activo: boolean;
}
