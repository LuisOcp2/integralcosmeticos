import { PartialType } from '@nestjs/swagger';
import { CrearTurnoDto } from './crear-turno.dto';

export class ActualizarTurnoDto extends PartialType(CrearTurnoDto) {}
