import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas-dia')
  @ApiOperation({ summary: 'Resumen de ventas del dia por sede' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  ventasDelDia(@Query('sedeId') sedeId: string, @Query('fecha') fecha: string) {
    return this.reportesService.ventasDelDia(sedeId, fecha);
  }

  @Get('ventas-sede')
  @ApiOperation({ summary: 'Ventas agrupadas por sede en un periodo' })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String })
  @ApiQuery({ name: 'fechaFin', required: true, type: String })
  ventasPorSede(@Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    return this.reportesService.ventasPorSede(fechaInicio, fechaFin);
  }

  @Get('productos-mas-vendidos')
  @ApiOperation({ summary: 'Top productos mas vendidos por sede y periodo' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String })
  @ApiQuery({ name: 'fechaFin', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  productosMasVendidos(
    @Query('sedeId') sedeId: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportesService.productosMasVendidos(
      sedeId,
      fechaInicio,
      fechaFin,
      limit ? Number(limit) : 10,
    );
  }

  @Get('margen')
  @ApiOperation({ summary: 'Margen por producto en un periodo y sede' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String })
  @ApiQuery({ name: 'fechaFin', required: true, type: String })
  margenPorProducto(
    @Query('sedeId') sedeId: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.reportesService.margenPorProducto(sedeId, fechaInicio, fechaFin);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Stock actual por sede con alerta de minimo' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  stockActualPorSede(@Query('sedeId') sedeId: string) {
    return this.reportesService.stockActualPorSede(sedeId);
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Productos por debajo del stock minimo' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  productosBajoMinimo(@Query('sedeId') sedeId: string) {
    return this.reportesService.productosBajoMinimo(sedeId);
  }

  @Get('clientes-frecuentes')
  @ApiOperation({ summary: 'Clientes frecuentes por sede y periodo' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String })
  @ApiQuery({ name: 'fechaFin', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  clientesFrecuentes(
    @Query('sedeId') sedeId: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportesService.clientesFrecuentes(
      sedeId,
      fechaInicio,
      fechaFin,
      limit ? Number(limit) : 10,
    );
  }

  @Get('cierre-caja')
  @ApiOperation({ summary: 'Resumen diario de cierre de caja por sede' })
  @ApiQuery({ name: 'sedeId', required: true, type: String })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  cierreCajaDiario(@Query('sedeId') sedeId: string, @Query('fecha') fecha: string) {
    return this.reportesService.cierreCajaDiario(sedeId, fecha);
  }
}
