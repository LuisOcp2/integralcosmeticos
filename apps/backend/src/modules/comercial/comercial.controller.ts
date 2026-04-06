import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CotizacionesService } from './cotizaciones.service';
import { PedidosService } from './pedidos.service';
import { FacturasService } from './facturas.service';
import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from './dto/actualizar-cotizacion.dto';
import { FiltrosCotizacionDto } from './dto/filtros-cotizacion.dto';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ActualizarPedidoDto } from './dto/actualizar-pedido.dto';
import { FiltrosPedidoDto } from './dto/filtros-pedido.dto';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado-pedido.dto';
import { CrearFacturaDto } from './dto/crear-factura.dto';
import { ActualizarFacturaDto } from './dto/actualizar-factura.dto';
import { FiltrosFacturaDto } from './dto/filtros-factura.dto';
import { RegistrarPagoFacturaDto } from './dto/registrar-pago-factura.dto';

@ApiTags('comercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
@Controller('comercial')
export class ComercialController {
  constructor(
    private readonly cotizacionesService: CotizacionesService,
    private readonly pedidosService: PedidosService,
    private readonly facturasService: FacturasService,
  ) {}

  @Post('cotizaciones')
  @ApiOperation({ summary: 'Crear cotizacion' })
  createCotizacion(@Body() dto: CrearCotizacionDto, @Request() req: any) {
    return this.cotizacionesService.create(dto, req.user.id, req.user?.sedeId);
  }

  @Get('cotizaciones')
  @ApiOperation({ summary: 'Listar cotizaciones' })
  findCotizaciones(@Query() query: FiltrosCotizacionDto) {
    return this.cotizacionesService.findAll(query);
  }

  @Get('cotizaciones/:id')
  @ApiOperation({ summary: 'Obtener cotizacion por id' })
  findCotizacion(@Param('id') id: string) {
    return this.cotizacionesService.findOne(id);
  }

  @Patch('cotizaciones/:id')
  @ApiOperation({ summary: 'Actualizar cotizacion' })
  updateCotizacion(@Param('id') id: string, @Body() dto: ActualizarCotizacionDto) {
    return this.cotizacionesService.update(id, dto);
  }

  @Delete('cotizaciones/:id')
  @ApiOperation({ summary: 'Eliminar cotizacion' })
  async removeCotizacion(@Param('id') id: string) {
    await this.cotizacionesService.remove(id);
    return { ok: true };
  }

  @Post('cotizaciones/:id/convertir-pedido')
  @ApiOperation({ summary: 'Convertir cotizacion a pedido' })
  convertirCotizacionAPedido(@Param('id') id: string) {
    return this.cotizacionesService.convertirAPedido(id);
  }

  @Get('cotizaciones/:id/pdf')
  @ApiOperation({ summary: 'Obtener texto de previsualizacion de cotizacion' })
  getCotizacionPdf(@Param('id') id: string) {
    return this.cotizacionesService.getPDF(id);
  }

  @Post('pedidos')
  @ApiOperation({ summary: 'Crear pedido' })
  createPedido(@Body() dto: CrearPedidoDto, @Request() req: any) {
    return this.pedidosService.create(dto, req.user.id);
  }

  @Get('pedidos')
  @ApiOperation({ summary: 'Listar pedidos' })
  findPedidos(@Query() query: FiltrosPedidoDto) {
    return this.pedidosService.findAll(query);
  }

  @Get('pedidos/:id')
  @ApiOperation({ summary: 'Obtener pedido por id' })
  findPedido(@Param('id') id: string) {
    return this.pedidosService.findOne(id);
  }

  @Patch('pedidos/:id')
  @ApiOperation({ summary: 'Actualizar pedido' })
  updatePedido(@Param('id') id: string, @Body() dto: ActualizarPedidoDto) {
    return this.pedidosService.update(id, dto);
  }

  @Patch('pedidos/:id/estado')
  @ApiOperation({ summary: 'Cambiar estado del pedido' })
  cambiarEstadoPedido(@Param('id') id: string, @Body() dto: CambiarEstadoPedidoDto) {
    return this.pedidosService.cambiarEstado(id, dto.estado, dto.nota);
  }

  @Post('pedidos/:id/convertir-factura')
  @ApiOperation({ summary: 'Convertir pedido a factura' })
  convertirPedidoAFactura(@Param('id') id: string) {
    return this.pedidosService.convertirAFactura(id);
  }

  @Post('facturas')
  @ApiOperation({ summary: 'Crear factura' })
  createFactura(@Body() dto: CrearFacturaDto, @Request() req: any) {
    return this.facturasService.create(dto, req.user.id);
  }

  @Get('facturas')
  @ApiOperation({ summary: 'Listar facturas' })
  findFacturas(@Query() query: FiltrosFacturaDto) {
    return this.facturasService.findAll(query);
  }

  @Get('facturas/cuentas-por-cobrar')
  @ApiOperation({ summary: 'Consultar cuentas por cobrar' })
  getCuentasPorCobrar(@Query('vencidas') vencidas?: string) {
    return this.facturasService.getCuentasPorCobrar(vencidas === 'true');
  }

  @Get('facturas/estado-cuenta/:clienteId')
  @ApiOperation({ summary: 'Consultar estado de cuenta por cliente' })
  getEstadoCuenta(@Param('clienteId') clienteId: string) {
    return this.facturasService.getEstadoCuentaCliente(clienteId);
  }

  @Get('facturas/:id')
  @ApiOperation({ summary: 'Obtener factura por id' })
  findFactura(@Param('id') id: string) {
    return this.facturasService.findOne(id);
  }

  @Patch('facturas/:id')
  @ApiOperation({ summary: 'Actualizar factura' })
  updateFactura(@Param('id') id: string, @Body() dto: ActualizarFacturaDto) {
    return this.facturasService.update(id, dto);
  }

  @Post('facturas/:id/pagos')
  @ApiOperation({ summary: 'Registrar pago de factura' })
  registrarPagoFactura(
    @Param('id') id: string,
    @Body() dto: RegistrarPagoFacturaDto,
    @Request() req: any,
  ) {
    return this.facturasService.registrarPago(id, dto, req.user.id);
  }

  @Get('facturas/:id/pagos')
  @ApiOperation({ summary: 'Listar pagos de factura' })
  getPagosFactura(@Param('id') id: string) {
    return this.facturasService.getPagos(id);
  }
}
