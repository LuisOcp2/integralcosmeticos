import { PartialType } from '@nestjs/swagger';
import { CreateInversionistaDto } from './create-inversionista.dto';

export class UpdateInversionistaDto extends PartialType(CreateInversionistaDto) {}
