import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateComentarioTareaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  texto: string;
}
