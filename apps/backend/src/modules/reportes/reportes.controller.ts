import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permiso, Rol } from '@cosmeticos/shared-types';
import { Response } from 'express';
import { Permisos } from '../auth/decorators/permisos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExportarVentasExcelQueryDto } from './dto/exportar-ventas-excel-query.dto';
import { ProductosMasVendidosQueryDto } from './dto/productos-mas-vendidos-query.dto';
import { ReportesQueryDto } from './dto/reportes-query.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permisos(Permiso.REPORTES_VER)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas/resumen')
  @ApiOperation({ summary: 'Resumen de ventas en el periodo' })
  ventasResumen(@Query() query: ReportesQueryDto) {
    return this.reportesService.getVentasResumen(query);
  }

  @Get('ventas/por-dia')
  @ApiOperation({ summary: 'Ventas agrupadas por dia para grafica' })
  ventasPorDia(@Query() query: ReportesQueryDto) {
    return this.reportesService.getVentasPorDia(query);
  }

  @Get('ventas/por-cajero')
  @ApiOperation({ summary: 'Ranking de cajeros por monto vendido' })
  ventasPorCajero(@Query() query: ReportesQueryDto) {
    return this.reportesService.getVentasPorCajero(query);
  }

  @Get('ventas/por-categoria')
  @ApiOperation({ summary: 'Ventas agrupadas por categoria de producto' })
  ventasPorCategoria(@Query() query: ReportesQueryDto) {
    return this.reportesService.getVentasPorCategoria(query);
  }

  @Get('ventas/productos-mas-vendidos')
  @ApiOperation({ summary: 'Top de productos por cantidad y monto vendido' })
  @ApiQuery({ name: 'top', required: false, type: Number })
  productosMasVendidos(@Query() query: ProductosMasVendidosQueryDto) {
    return this.reportesService.getProductosMasVendidos(query);
  }

  @Get('inventario/valorizado')
  @ApiOperation({ summary: 'Valor total del inventario por sede y categoria' })
  inventarioValorizado(@Query() query: ReportesQueryDto) {
    return this.reportesService.getInventarioValorizado(query);
  }

  @Get('inventario/rotacion')
  @ApiOperation({ summary: 'Productos con mayor y menor rotacion' })
  inventarioRotacion(@Query() query: ReportesQueryDto) {
    return this.reportesService.getInventarioRotacion(query);
  }

  @Get('inventario/alertas')
  @ApiOperation({ summary: 'Productos con stock por debajo del minimo' })
  inventarioAlertas(@Query() query: ReportesQueryDto) {
    return this.reportesService.getInventarioAlertas(query);
  }

  @Get('clientes/nuevos')
  @ApiOperation({ summary: 'Clientes nuevos registrados en el periodo' })
  clientesNuevos(@Query() query: ReportesQueryDto) {
    return this.reportesService.getClientesNuevos(query);
  }

  @Get('clientes/frecuentes')
  @ApiOperation({ summary: 'Top 20 clientes por compras en el periodo' })
  clientesFrecuentes(@Query() query: ReportesQueryDto) {
    return this.reportesService.getClientesFrecuentes(query);
  }

  @Get('clientes/retencion')
  @ApiOperation({ summary: 'Clientes que compraron mes anterior y mes actual' })
  clientesRetencion(@Query() query: ReportesQueryDto) {
    return this.reportesService.getClientesRetencion(query);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @Permisos(Permiso.REPORTES_VER)
  @ApiOperation({ summary: 'Dashboard ejecutivo de KPIs' })
  dashboard(@Query() query: ReportesQueryDto) {
    return this.reportesService.getDashboardEjecutivo(query.sedeId);
  }

  @Get('ventas/exportar-excel')
  @Permisos(Permiso.REPORTES_VER, Permiso.REPORTES_EXPORTAR)
  @ApiOperation({ summary: 'Exporta ventas mensuales a archivo Excel' })
  async exportarVentasExcel(
    @Query() query: ExportarVentasExcelQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.reportesService.exportarVentasExcel(query);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
