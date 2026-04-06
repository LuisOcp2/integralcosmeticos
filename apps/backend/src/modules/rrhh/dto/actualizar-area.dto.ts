import { PartialType } from '@nestjs/swagger';
import { CrearAreaDto } from './crear-area.dto';

export class ActualizarAreaDto extends PartialType(CrearAreaDto) {}
