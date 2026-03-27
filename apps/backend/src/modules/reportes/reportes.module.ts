import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaModule } from '../caja/caja.module';
import { CierreCaja } from '../caja/entities/cierre-caja.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { ClientesModule } from '../clientes/clientes.module';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { StockSede } from '../inventario/entities/stock-sede.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { VentasModule } from '../ventas/ventas.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      DetalleVenta,
      Sede,
      Producto,
      Variante,
      StockSede,
      Cliente,
      CierreCaja,
      Usuario,
    ]),
    VentasModule,
    InventarioModule,
    ClientesModule,
    CajaModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
