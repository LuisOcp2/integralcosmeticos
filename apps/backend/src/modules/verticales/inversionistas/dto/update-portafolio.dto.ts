import { PartialType } from '@nestjs/swagger';
import { CreatePortafolioDto } from './create-portafolio.dto';

export class UpdatePortafolioDto extends PartialType(CreatePortafolioDto) {}
