import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SesionCaja, Sede, Caja, Venta])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
