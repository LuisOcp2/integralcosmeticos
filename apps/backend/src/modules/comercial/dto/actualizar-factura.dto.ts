import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CrearFacturaDto } from './crear-factura.dto';
import { EstadoFactura } from '../entities/factura.entity';

export class ActualizarFacturaDto extends PartialType(CrearFacturaDto) {
  @IsOptional()
  @IsEnum(EstadoFactura)
  estado?: EstadoFactura;
}
