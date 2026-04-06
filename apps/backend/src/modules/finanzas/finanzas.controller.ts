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
import { ConciliacionService } from './conciliacion.service';
import { FinanzasReportesService } from './finanzas-reportes.service';
import { TesoreriaService } from './tesoreria.service';
import { CrearCuentaBancariaDto } from './dto/crear-cuenta-bancaria.dto';
import { ActualizarCuentaBancariaDto } from './dto/actualizar-cuenta-bancaria.dto';
import { FiltrosCuentaBancariaDto } from './dto/filtros-cuenta-bancaria.dto';
import { FiltrosMovimientoBancarioDto } from './dto/filtros-movimiento-bancario.dto';
import { RegistrarIngresoDto } from './dto/registrar-ingreso.dto';
import { RegistrarEgresoDto } from './dto/registrar-egreso.dto';
import { TrasladarEntreCuentasDto } from './dto/trasladar-entre-cuentas.dto';
import { GetFlujoCajaDto } from './dto/get-flujo-caja.dto';
import { ImportarExtractoCsvDto } from './dto/importar-extracto-csv.dto';
import { GetConciliacionDto } from './dto/get-conciliacion.dto';
import { FiltrosPeriodoContableDto } from './dto/filtros-periodo-contable.dto';
import { CerrarPeriodoContableDto } from './dto/cerrar-periodo-contable.dto';
import { FiltrosPresupuestoMensualDto } from './dto/filtros-presupuesto-mensual.dto';
import { CrearPresupuestoMensualDto } from './dto/crear-presupuesto-mensual.dto';
import { ActualizarPresupuestoMensualDto } from './dto/actualizar-presupuesto-mensual.dto';
import { RegistrarIngresoMovimientoDto } from './dto/registrar-ingreso-movimiento.dto';
import { RegistrarEgresoMovimientoDto } from './dto/registrar-egreso-movimiento.dto';

@ApiTags('finanzas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('finanzas')
export class FinanzasController {
  constructor(
    private readonly tesoreriaService: TesoreriaService,
    private readonly conciliacionService: ConciliacionService,
    private readonly finanzasReportesService: FinanzasReportesService,
  ) {}

  @Get('cuentas')
  @ApiOperation({ summary: 'Listar cuentas bancarias' })
  getCuentas(@Query() query: FiltrosCuentaBancariaDto) {
    return this.tesoreriaService.listarCuentas(query);
  }

  @Post('cuentas')
  @ApiOperation({ summary: 'Crear cuenta bancaria' })
  createCuenta(@Body() dto: CrearCuentaBancariaDto) {
    return this.tesoreriaService.crearCuenta(dto);
  }

  @Get('cuentas/:id')
  @ApiOperation({ summary: 'Obtener cuenta bancaria por id' })
  getCuenta(@Param('id') id: string) {
    return this.tesoreriaService.obtenerCuenta(id);
  }

  @Patch('cuentas/:id')
  @ApiOperation({ summary: 'Actualizar cuenta bancaria' })
  updateCuenta(@Param('id') id: string, @Body() dto: ActualizarCuentaBancariaDto) {
    return this.tesoreriaService.actualizarCuenta(id, dto);
  }

  @Delete('cuentas/:id')
  @ApiOperation({ summary: 'Eliminar cuenta bancaria' })
  deleteCuenta(@Param('id') id: string) {
    return this.tesoreriaService.eliminarCuenta(id);
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Listar movimientos bancarios con filtros' })
  getMovimientos(@Query() query: FiltrosMovimientoBancarioDto) {
    return this.tesoreriaService.getMovimientos(query);
  }

  @Post('movimientos/ingreso/:cuentaId')
  @ApiOperation({ summary: 'Registrar ingreso bancario' })
  registrarIngreso(
    @Param('cuentaId') cuentaId: string,
    @Body() dto: RegistrarIngresoDto,
    @Request() req: any,
  ) {
    return this.tesoreriaService.registrarIngreso(cuentaId, dto, req.user.id);
  }

  @Post('movimientos/ingreso')
  @ApiOperation({ summary: 'Registrar ingreso bancario' })
  registrarIngresoEnMovimientos(@Body() dto: RegistrarIngresoMovimientoDto, @Request() req: any) {
    return this.tesoreriaService.registrarIngreso(dto.cuentaId, dto, req.user.id);
  }

  @Post('movimientos/egreso/:cuentaId')
  @ApiOperation({ summary: 'Registrar egreso bancario' })
  registrarEgreso(
    @Param('cuentaId') cuentaId: string,
    @Body() dto: RegistrarEgresoDto,
    @Request() req: any,
  ) {
    return this.tesoreriaService.registrarEgreso(cuentaId, dto, req.user.id);
  }

  @Post('movimientos/egreso')
  @ApiOperation({ summary: 'Registrar egreso bancario' })
  registrarEgresoEnMovimientos(@Body() dto: RegistrarEgresoMovimientoDto, @Request() req: any) {
    return this.tesoreriaService.registrarEgreso(dto.cuentaId, dto, req.user.id);
  }

  @Post('movimientos/traslado')
  @ApiOperation({ summary: 'Trasladar fondos entre cuentas bancarias' })
  trasladar(@Body() dto: TrasladarEntreCuentasDto, @Request() req: any) {
    return this.tesoreriaService.trasladarEntreCuentas(
      dto.cuentaOrigenId,
      dto.cuentaDestinoId,
      dto.monto,
      dto.descripcion,
      req.user.id,
    );
  }

  @Post('conciliacion/importar')
  @ApiOperation({ summary: 'Importar extracto bancario CSV' })
  importarExtracto(@Body() dto: ImportarExtractoCsvDto, @Request() req: any) {
    return this.conciliacionService.importarExtractoCSV(dto.cuentaId, dto.csv, req.user.id);
  }

  @Get('conciliacion/:cuentaId')
  @ApiOperation({ summary: 'Obtener movimientos no conciliados' })
  getNoConciliados(@Param('cuentaId') cuentaId: string, @Query() query: GetConciliacionDto) {
    return this.conciliacionService.getMovimientosNoConciliados(cuentaId, query.mes, query.ano);
  }

  @Patch('conciliacion/:movimientoId/conciliar')
  @ApiOperation({ summary: 'Conciliar movimiento bancario' })
  conciliar(@Param('movimientoId') movimientoId: string) {
    return this.conciliacionService.conciliarMovimiento(movimientoId);
  }

  @Get('conciliacion/reporte/:cuentaId')
  @ApiOperation({ summary: 'Reporte de conciliacion bancaria mensual' })
  getReporteConciliacion(@Param('cuentaId') cuentaId: string, @Query() query: GetConciliacionDto) {
    return this.conciliacionService.getReporteConciliacion(cuentaId, query.mes, query.ano);
  }

  @Get('tesoreria')
  @ApiOperation({ summary: 'Resumen de tesoreria' })
  getTesoreria() {
    return this.tesoreriaService.getResumenTesoreria();
  }

  @Get('tesoreria/saldos')
  @ApiOperation({ summary: 'Saldos actuales por cuenta bancaria' })
  getSaldosActuales() {
    return this.tesoreriaService.getSaldosActuales();
  }

  @Get('tesoreria/flujo-caja')
  @ApiOperation({ summary: 'Flujo de caja por rango de fechas' })
  getFlujoCaja(@Query() query: GetFlujoCajaDto) {
    return this.tesoreriaService.getFlujoCaja(query.cuentaId, query.fechaDesde, query.fechaHasta);
  }

  @Get('presupuesto')
  @ApiOperation({ summary: 'Listar presupuestos mensuales' })
  listarPresupuestos(@Query() query: FiltrosPresupuestoMensualDto) {
    return this.finanzasReportesService.listarPresupuestos(query);
  }

  @Post('presupuesto')
  @ApiOperation({ summary: 'Crear presupuesto mensual' })
  crearPresupuesto(@Body() dto: CrearPresupuestoMensualDto) {
    return this.finanzasReportesService.crearPresupuesto(dto);
  }

  @Patch('presupuesto/:id')
  @ApiOperation({ summary: 'Actualizar presupuesto mensual' })
  actualizarPresupuesto(@Param('id') id: string, @Body() dto: ActualizarPresupuestoMensualDto) {
    return this.finanzasReportesService.actualizarPresupuesto(id, dto);
  }

  @Delete('presupuesto/:id')
  @ApiOperation({ summary: 'Eliminar presupuesto mensual' })
  eliminarPresupuesto(@Param('id') id: string) {
    return this.finanzasReportesService.eliminarPresupuesto(id);
  }

  @Get('presupuesto/:mes/:ano')
  @ApiOperation({ summary: 'Ejecucion de presupuesto mensual' })
  getEjecucionPresupuesto(@Param('mes') mes: number, @Param('ano') ano: number) {
    return this.finanzasReportesService.getEjecucionPresupuesto(Number(mes), Number(ano));
  }

  @Get('periodos')
  @ApiOperation({ summary: 'Listar periodos contables de finanzas' })
  getPeriodos(@Query() query: FiltrosPeriodoContableDto) {
    return this.finanzasReportesService.listarPeriodos(query);
  }

  @Patch('periodos/:id/cerrar')
  @ApiOperation({ summary: 'Cerrar o bloquear periodo contable' })
  cerrarPeriodo(
    @Param('id') id: string,
    @Body() dto: CerrarPeriodoContableDto,
    @Request() req: any,
  ) {
    return this.finanzasReportesService.cerrarPeriodo(id, dto, req.user.id);
  }

  @Get('indicadores')
  @ApiOperation({ summary: 'Indicadores financieros clave' })
  getIndicadores() {
    return this.finanzasReportesService.getIndicadores();
  }
}
