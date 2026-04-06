import { PartialType } from '@nestjs/swagger';
import { CrearCargoDto } from './crear-cargo.dto';

export class ActualizarCargoDto extends PartialType(CrearCargoDto) {}
