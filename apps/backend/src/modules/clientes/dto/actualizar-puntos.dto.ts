import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ActualizarPuntosDto {
  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  puntos: number;
}
