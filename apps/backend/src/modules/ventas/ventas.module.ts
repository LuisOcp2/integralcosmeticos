import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventario/inventario.module';
import { CierreCaja } from '../caja/entities/cierre-caja.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { Venta } from './entities/venta.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta, CierreCaja, Variante, Producto, Cliente, Sede]),
    forwardRef(() => InventarioModule),
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
