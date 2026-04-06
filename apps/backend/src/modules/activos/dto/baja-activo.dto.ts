import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class BajaActivoDto {
  @ApiProperty({ example: 'Obsolescencia y fin de vida util' })
  @IsString()
  @MaxLength(2000)
  motivo: string;
}
