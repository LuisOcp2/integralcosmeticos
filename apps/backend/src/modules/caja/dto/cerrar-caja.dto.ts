import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 350000 })
  @IsNumber()
  @Min(0)
  montoFinal: number;
}
