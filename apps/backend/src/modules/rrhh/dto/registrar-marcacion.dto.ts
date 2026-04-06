import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RegistrarMarcacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  empleadoId: string;
}
