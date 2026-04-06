import { PartialType } from '@nestjs/swagger';
import { CreateMovimientoInversionDto } from './create-movimiento-inversion.dto';

export class UpdateMovimientoInversionDto extends PartialType(CreateMovimientoInversionDto) {}
