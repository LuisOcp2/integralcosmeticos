import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AnularVentaDto {
  @ApiProperty({ example: 'Producto defectuoso / solicitud del cliente' })
  @IsString()
  @MinLength(3)
  motivo: string;
}
