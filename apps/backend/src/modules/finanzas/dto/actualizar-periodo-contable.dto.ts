import { PartialType } from '@nestjs/swagger';
import { CrearPeriodoContableDto } from './crear-periodo-contable.dto';

export class ActualizarPeriodoContableDto extends PartialType(CrearPeriodoContableDto) {}
