import { PartialType } from '@nestjs/swagger';
import { CreatePlantillaMensajeDto } from './create-plantilla-mensaje.dto';

export class UpdatePlantillaMensajeDto extends PartialType(CreatePlantillaMensajeDto) {}
