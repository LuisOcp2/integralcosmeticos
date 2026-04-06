import { PartialType } from '@nestjs/swagger';
import { CreateActivoDto } from './create-activo.dto';

export class UpdateActivoDto extends PartialType(CreateActivoDto) {}
