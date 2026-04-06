import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class ImportarExtractoCsvDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaId: string;

  @ApiProperty()
  @IsString()
  csv: string;
}
