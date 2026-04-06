import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { AlertaStock } from './entities/alerta-stock.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { StockSede } from './entities/stock-sede.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockSede, MovimientoInventario, AlertaStock, Variante, Sede]),
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
