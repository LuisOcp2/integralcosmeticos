import { PartialType } from '@nestjs/swagger';
import { CreateParametroConfiguracionDto } from './create-parametro-configuracion.dto';

export class UpdateParametroConfiguracionDto extends PartialType(CreateParametroConfiguracionDto) {}
