import { PartialType } from '@nestjs/swagger';
import { CrearMovimientoBancarioDto } from './crear-movimiento-bancario.dto';

export class ActualizarMovimientoBancarioDto extends PartialType(CrearMovimientoBancarioDto) {}
