import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ComercialController } from './comercial.controller';
import { CotizacionesService } from './cotizaciones.service';
import { PedidosService } from './pedidos.service';
import { FacturasService } from './facturas.service';
import { Cotizacion } from './entities/cotizacion.entity';
import { DetalleCotizacion } from './entities/detalle-cotizacion.entity';
import { Pedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { Factura } from './entities/factura.entity';
import { PagoFactura } from './entities/pago-factura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cotizacion,
      DetalleCotizacion,
      Pedido,
      DetallePedido,
      Factura,
      PagoFactura,
      Cliente,
      Variante,
      Producto,
      Usuario,
    ]),
  ],
  controllers: [ComercialController],
  providers: [CotizacionesService, PedidosService, FacturasService],
  exports: [CotizacionesService, PedidosService, FacturasService],
})
export class ComercialModule {}
