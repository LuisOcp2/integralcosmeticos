import { PartialType } from '@nestjs/swagger';
import { CreateCarpetaDto } from './create-carpeta.dto';

export class UpdateCarpetaDto extends PartialType(CreateCarpetaDto) {}
