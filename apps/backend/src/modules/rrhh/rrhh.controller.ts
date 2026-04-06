import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpleadosService } from './empleados.service';
import { TurnosService } from './turnos.service';
import { AsistenciaService } from './asistencia.service';
import { VacacionesService } from './vacaciones.service';
import { CrearAreaDto } from './dto/crear-area.dto';
import { ActualizarAreaDto } from './dto/actualizar-area.dto';
import { FiltrosAreaDto } from './dto/filtros-area.dto';
import { CrearCargoDto } from './dto/crear-cargo.dto';
import { ActualizarCargoDto } from './dto/actualizar-cargo.dto';
import { FiltrosCargoDto } from './dto/filtros-cargo.dto';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { ActualizarEmpleadoDto } from './dto/actualizar-empleado.dto';
import { FiltrosEmpleadoDto } from './dto/filtros-empleado.dto';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { ActualizarTurnoDto } from './dto/actualizar-turno.dto';
import { FiltrosTurnoDto } from './dto/filtros-turno.dto';
import { CrearAsignacionTurnoDto } from './dto/crear-asignacion-turno.dto';
import { ActualizarAsignacionTurnoDto } from './dto/actualizar-asignacion-turno.dto';
import { FiltrosAsignacionTurnoDto } from './dto/filtros-asignacion-turno.dto';
import { RegistrarMarcacionDto } from './dto/registrar-marcacion.dto';
import { ReporteMensualAsistenciaDto } from './dto/reporte-mensual-asistencia.dto';
import { ReporteAreaAsistenciaDto } from './dto/reporte-area-asistencia.dto';
import { SolicitarVacacionesDto } from './dto/solicitar-vacaciones.dto';
import { FiltrosVacacionesDto } from './dto/filtros-vacaciones.dto';
import { RechazarVacacionesDto } from './dto/rechazar-vacaciones.dto';
import { EstadoDiaAsistenciaDto } from './dto/estado-dia-asistencia.dto';

@ApiTags('rrhh')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('rrhh')
export class RrhhController {
  constructor(
    private readonly empleadosService: EmpleadosService,
    private readonly turnosService: TurnosService,
    private readonly asistenciaService: AsistenciaService,
    private readonly vacacionesService: VacacionesService,
  ) {}

  @Post('areas')
  @ApiOperation({ summary: 'Crear area' })
  crearArea(@Body() dto: CrearAreaDto) {
    return this.empleadosService.crearArea(dto);
  }

  @Get('areas')
  @ApiOperation({ summary: 'Listar areas' })
  listarAreas(@Query() query: FiltrosAreaDto) {
    return this.empleadosService.listarAreas(query);
  }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Obtener area por id' })
  obtenerArea(@Param('id') id: string) {
    return this.empleadosService.obtenerArea(id);
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Actualizar area' })
  actualizarArea(@Param('id') id: string, @Body() dto: ActualizarAreaDto) {
    return this.empleadosService.actualizarArea(id, dto);
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Desactivar area' })
  eliminarArea(@Param('id') id: string) {
    return this.empleadosService.eliminarArea(id);
  }

  @Post('cargos')
  @ApiOperation({ summary: 'Crear cargo' })
  crearCargo(@Body() dto: CrearCargoDto) {
    return this.empleadosService.crearCargo(dto);
  }

  @Get('cargos')
  @ApiOperation({ summary: 'Listar cargos' })
  listarCargos(@Query() query: FiltrosCargoDto) {
    return this.empleadosService.listarCargos(query);
  }

  @Get('cargos/:id')
  @ApiOperation({ summary: 'Obtener cargo por id' })
  obtenerCargo(@Param('id') id: string) {
    return this.empleadosService.obtenerCargo(id);
  }

  @Patch('cargos/:id')
  @ApiOperation({ summary: 'Actualizar cargo' })
  actualizarCargo(@Param('id') id: string, @Body() dto: ActualizarCargoDto) {
    return this.empleadosService.actualizarCargo(id, dto);
  }

  @Delete('cargos/:id')
  @ApiOperation({ summary: 'Eliminar cargo' })
  eliminarCargo(@Param('id') id: string) {
    return this.empleadosService.eliminarCargo(id);
  }

  @Post('empleados')
  @ApiOperation({ summary: 'Crear empleado' })
  crearEmpleado(@Body() dto: CrearEmpleadoDto) {
    return this.empleadosService.crearEmpleado(dto);
  }

  @Get('empleados')
  @ApiOperation({ summary: 'Listar empleados' })
  listarEmpleados(@Query() query: FiltrosEmpleadoDto) {
    return this.empleadosService.listarEmpleados(query);
  }

  @Get('empleados/organigrama')
  @ApiOperation({ summary: 'Organigrama por areas y subordinados' })
  getOrganigrama() {
    return this.empleadosService.getOrganigrama();
  }

  @Get('empleados/:id')
  @ApiOperation({ summary: 'Obtener empleado por id' })
  obtenerEmpleado(@Param('id') id: string) {
    return this.empleadosService.obtenerEmpleado(id);
  }

  @Patch('empleados/:id')
  @ApiOperation({ summary: 'Actualizar empleado' })
  actualizarEmpleado(@Param('id') id: string, @Body() dto: ActualizarEmpleadoDto) {
    return this.empleadosService.actualizarEmpleado(id, dto);
  }

  @Delete('empleados/:id')
  @ApiOperation({ summary: 'Retirar empleado' })
  eliminarEmpleado(@Param('id') id: string) {
    return this.empleadosService.eliminarEmpleado(id);
  }

  @Post('turnos')
  @ApiOperation({ summary: 'Crear turno' })
  crearTurno(@Body() dto: CrearTurnoDto) {
    return this.turnosService.crearTurno(dto);
  }

  @Get('turnos')
  @ApiOperation({ summary: 'Listar turnos' })
  listarTurnos(@Query() query: FiltrosTurnoDto) {
    return this.turnosService.listarTurnos(query);
  }

  @Get('turnos/:id')
  @ApiOperation({ summary: 'Obtener turno por id' })
  obtenerTurno(@Param('id') id: string) {
    return this.turnosService.obtenerTurno(id);
  }

  @Patch('turnos/:id')
  @ApiOperation({ summary: 'Actualizar turno' })
  actualizarTurno(@Param('id') id: string, @Body() dto: ActualizarTurnoDto) {
    return this.turnosService.actualizarTurno(id, dto);
  }

  @Delete('turnos/:id')
  @ApiOperation({ summary: 'Desactivar turno' })
  eliminarTurno(@Param('id') id: string) {
    return this.turnosService.eliminarTurno(id);
  }

  @Post('turnos/asignaciones')
  @ApiOperation({ summary: 'Crear asignacion de turno' })
  crearAsignacion(@Body() dto: CrearAsignacionTurnoDto) {
    return this.turnosService.crearAsignacion(dto);
  }

  @Get('turnos/asignaciones')
  @ApiOperation({ summary: 'Listar asignaciones de turno' })
  listarAsignaciones(@Query() query: FiltrosAsignacionTurnoDto) {
    return this.turnosService.listarAsignaciones(query);
  }

  @Get('turnos/asignaciones/:id')
  @ApiOperation({ summary: 'Obtener asignacion de turno por id' })
  obtenerAsignacion(@Param('id') id: string) {
    return this.turnosService.obtenerAsignacion(id);
  }

  @Patch('turnos/asignaciones/:id')
  @ApiOperation({ summary: 'Actualizar asignacion de turno' })
  actualizarAsignacion(@Param('id') id: string, @Body() dto: ActualizarAsignacionTurnoDto) {
    return this.turnosService.actualizarAsignacion(id, dto);
  }

  @Delete('turnos/asignaciones/:id')
  @ApiOperation({ summary: 'Eliminar asignacion de turno' })
  eliminarAsignacion(@Param('id') id: string) {
    return this.turnosService.eliminarAsignacion(id);
  }

  @Post('asistencia/entrada')
  @ApiOperation({ summary: 'Registrar entrada del dia' })
  registrarEntrada(@Body() dto: RegistrarMarcacionDto, @Req() req: any) {
    return this.asistenciaService.registrarEntrada(dto.empleadoId, req.user.id);
  }

  @Post('asistencia/salida')
  @ApiOperation({ summary: 'Registrar salida del dia' })
  registrarSalida(@Body() dto: RegistrarMarcacionDto, @Req() req: any) {
    return this.asistenciaService.registrarSalida(dto.empleadoId, req.user.id);
  }

  @Get('asistencia/reporte-mensual')
  @ApiOperation({ summary: 'Resumen mensual de asistencia por empleado' })
  getResumenMensual(@Query() query: ReporteMensualAsistenciaDto) {
    return this.asistenciaService.getResumenMensual(query.empleadoId, query.mes, query.ano);
  }

  @Get('asistencia/reporte-area')
  @ApiOperation({ summary: 'Reporte mensual de asistencia por area' })
  getReporteArea(@Query() query: ReporteAreaAsistenciaDto) {
    return this.asistenciaService.getReportePorArea(query.areaId, query.mes, query.ano);
  }

  @Get('asistencia/estado-dia')
  @ApiOperation({ summary: 'Estado diario de asistencia por empleado' })
  getEstadoDia(@Query() query: EstadoDiaAsistenciaDto) {
    return this.asistenciaService.getEstadoDia(query.fecha, query.sedeId);
  }

  @Post('vacaciones')
  @ApiOperation({ summary: 'Solicitar vacaciones' })
  solicitarVacaciones(@Body() dto: SolicitarVacacionesDto) {
    return this.vacacionesService.solicitar(dto.empleadoId, dto.fechaInicio, dto.fechaFin);
  }

  @Get('vacaciones')
  @ApiOperation({ summary: 'Listar solicitudes de vacaciones' })
  listarVacaciones(@Query() query: FiltrosVacacionesDto) {
    return this.vacacionesService.listar(query);
  }

  @Patch('vacaciones/:id/aprobar')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Aprobar solicitud de vacaciones' })
  aprobarVacaciones(@Param('id') id: string, @Req() req: any) {
    return this.vacacionesService.aprobar(id, req.user.id);
  }

  @Patch('vacaciones/:id/rechazar')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Rechazar solicitud de vacaciones' })
  rechazarVacaciones(@Param('id') id: string, @Body() dto: RechazarVacacionesDto) {
    return this.vacacionesService.rechazar(id, dto.motivo);
  }
}
