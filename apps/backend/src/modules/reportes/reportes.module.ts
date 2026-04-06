import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { CajaModule } from '../caja/caja.module';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
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
      SesionCaja,
      Usuario,
    ]),
    VentasModule,
    InventarioModule,
    ClientesModule,
    CajaModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService, PermisosGuard],
  exports: [ReportesService],
})
export class ReportesModule {}
