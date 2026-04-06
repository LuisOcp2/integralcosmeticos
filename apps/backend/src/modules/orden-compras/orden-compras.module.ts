import { Module } from '@nestjs/common';
import { OrdenComprasService } from './orden-compras.service';
import { OrdenComprasController } from './orden-compras.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { PdfGeneratorUtil } from './utils/pdf-generator.util';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrdenCompra, DetalleOrdenCompra, Proveedor]),
    InventarioModule,
  ],
  providers: [OrdenComprasService, PdfGeneratorUtil],
  controllers: [OrdenComprasController],
  exports: [OrdenComprasService],
})
export class OrdenComprasModule {}
