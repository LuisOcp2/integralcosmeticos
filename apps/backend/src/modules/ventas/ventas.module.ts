import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventario/inventario.module';
import { Caja } from '../caja/entities/caja.entity';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
import { ClientesModule } from '../clientes/clientes.module';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { Venta } from './entities/venta.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      DetalleVenta,
      SesionCaja,
      Caja,
      Variante,
      Producto,
      Sede,
      Usuario,
    ]),
    forwardRef(() => InventarioModule),
    ClientesModule,
    ContabilidadModule,
    WorkflowsModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
