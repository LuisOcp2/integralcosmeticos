import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { CierreCaja } from './entities/cierre-caja.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CierreCaja, Sede, Venta])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
