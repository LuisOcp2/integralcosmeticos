import { PartialType } from '@nestjs/swagger';
import { SolicitarVacacionesDto } from './solicitar-vacaciones.dto';

export class ActualizarVacacionesDto extends PartialType(SolicitarVacacionesDto) {}
