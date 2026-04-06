import { PartialType } from '@nestjs/swagger';
import { CrearLeadDto } from './crear-lead.dto';

export class ActualizarLeadDto extends PartialType(CrearLeadDto) {}
