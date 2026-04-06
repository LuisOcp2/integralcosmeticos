import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../comercial/entities/factura.entity';
import { ConciliacionService } from './conciliacion.service';
import { FinanzasController } from './finanzas.controller';
import { FinanzasReportesService } from './finanzas-reportes.service';
import { TesoreriaService } from './tesoreria.service';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';
import { MovimientoBancario } from './entities/movimiento-bancario.entity';
import { PeriodoContable } from './entities/periodo-contable.entity';
import { PresupuestoMensual } from './entities/presupuesto-mensual.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaBancaria,
      MovimientoBancario,
      PeriodoContable,
      PresupuestoMensual,
      Factura,
    ]),
  ],
  controllers: [FinanzasController],
  providers: [TesoreriaService, ConciliacionService, FinanzasReportesService],
  exports: [TesoreriaService, ConciliacionService, FinanzasReportesService],
})
export class FinanzasModule {}
