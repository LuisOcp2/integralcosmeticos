import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { RegistrarIngresoDto } from './registrar-ingreso.dto';

export class RegistrarIngresoMovimientoDto extends RegistrarIngresoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cuentaId: string;
}
