import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RechazarVacacionesDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  motivo: string;
}
