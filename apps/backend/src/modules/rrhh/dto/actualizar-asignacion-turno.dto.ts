import { PartialType } from '@nestjs/swagger';
import { CrearAsignacionTurnoDto } from './crear-asignacion-turno.dto';

export class ActualizarAsignacionTurnoDto extends PartialType(CrearAsignacionTurnoDto) {}
