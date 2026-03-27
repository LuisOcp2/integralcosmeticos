import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class AbrirCajaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  montoInicial: number;
}
