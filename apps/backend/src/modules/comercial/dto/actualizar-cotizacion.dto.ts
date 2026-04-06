import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CrearCotizacionDto } from './crear-cotizacion.dto';
import { EstadoCotizacion } from '../entities/cotizacion.entity';

export class ActualizarCotizacionDto extends PartialType(CrearCotizacionDto) {
  @IsOptional()
  @IsEnum(EstadoCotizacion)
  estado?: EstadoCotizacion;
}
