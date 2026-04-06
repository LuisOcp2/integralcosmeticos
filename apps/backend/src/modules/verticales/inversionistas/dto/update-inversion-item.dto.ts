import { PartialType } from '@nestjs/swagger';
import { CreateInversionItemDto } from './create-inversion-item.dto';

export class UpdateInversionItemDto extends PartialType(CreateInversionItemDto) {}
