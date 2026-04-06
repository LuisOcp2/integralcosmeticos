import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AsignarConversacionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  usuarioId: string;
}
