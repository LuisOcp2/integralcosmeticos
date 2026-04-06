import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { RegistrarEgresoDto } from './registrar-egreso.dto';

export class RegistrarEgresoMovimientoDto extends RegistrarEgresoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaId: string;
}
