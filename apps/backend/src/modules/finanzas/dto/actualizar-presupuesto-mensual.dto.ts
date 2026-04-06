import { PartialType } from '@nestjs/swagger';
import { CrearPresupuestoMensualDto } from './crear-presupuesto-mensual.dto';

export class ActualizarPresupuestoMensualDto extends PartialType(CrearPresupuestoMensualDto) {}
