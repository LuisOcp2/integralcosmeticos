import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class TrasladarActivoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeDestinoId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  custodioDestinoId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  descripcion: string;
}
