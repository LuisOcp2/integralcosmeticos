import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../ventas/entities/venta.entity';
import { AsientoContable } from './entities/asiento-contable.entity';
import { CuentaContable } from './entities/cuenta-contable.entity';
import { MovimientoContable } from './entities/movimiento-contable.entity';
import { PeriodoContable } from './entities/periodo-contable.entity';
import { ContabilidadController } from './contabilidad.controller';
import { ContabilidadService } from './contabilidad.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaContable,
      AsientoContable,
      MovimientoContable,
      PeriodoContable,
      Venta,
    ]),
  ],
  controllers: [ContabilidadController],
  providers: [ContabilidadService],
  exports: [ContabilidadService],
})
export class ContabilidadModule {}
