import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class TrasladarEntreCuentasDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaOrigenId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaDestinoId: string;

  @ApiProperty({ example: 120000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty()
  @IsString()
  descripcion: string;
}
