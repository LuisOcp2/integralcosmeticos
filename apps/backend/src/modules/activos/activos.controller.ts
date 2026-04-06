import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { ActivosQueryDto } from './dto/activos-query.dto';
import { TrasladarActivoDto } from './dto/trasladar-activo.dto';
import { BajaActivoDto } from './dto/baja-activo.dto';
import { DepreciacionMesDto } from './dto/depreciacion-mes.dto';

@ApiTags('activos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear activo' })
  create(@Body() dto: CreateActivoDto, @Request() req: any) {
    return this.activosService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar activos con filtros y paginacion' })
  findAll(@Query() query: ActivosQueryDto) {
    return this.activosService.findAll(query);
  }

  @Get('reporte')
  @ApiOperation({ summary: 'Reporte de valorizacion por categoria' })
  getReporte() {
    return this.activosService.getReporteValorizacion();
  }

  @Get('mantenimientos-proximos')
  @ApiOperation({ summary: 'Activos con mantenimiento proximo' })
  getMantenimientosProximos(@Query('dias', new DefaultValuePipe(30), ParseIntPipe) dias: number) {
    return this.activosService.getProximosMantenimientos(dias);
  }

  @Get('empleados')
  @ApiOperation({ summary: 'Listar empleados para seleccion de custodio (fallback seguro)' })
  getEmpleados(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ) {
    return this.activosService.getEmpleadosDisponibles(page, limit);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Historial de movimientos del activo' })
  getHistorial(@Param('id') id: string) {
    return this.activosService.getHistorial(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener activo por id' })
  findOne(@Param('id') id: string) {
    return this.activosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar activo' })
  update(@Param('id') id: string, @Body() dto: UpdateActivoDto) {
    return this.activosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar activo' })
  remove(@Param('id') id: string) {
    return this.activosService.remove(id);
  }

  @Post(':id/trasladar')
  @ApiOperation({ summary: 'Trasladar activo de sede/custodio' })
  trasladar(@Param('id') id: string, @Body() dto: TrasladarActivoDto, @Request() req: any) {
    return this.activosService.trasladar(
      id,
      dto.sedeDestinoId,
      dto.custodioDestinoId,
      dto.descripcion,
      req.user.id,
    );
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja un activo' })
  darDeBaja(@Param('id') id: string, @Body() dto: BajaActivoDto, @Request() req: any) {
    return this.activosService.darDeBaja(id, dto.motivo, req.user.id);
  }

  @Post(':id/depreciacion')
  @ApiOperation({ summary: 'Calcular y registrar depreciacion mensual' })
  calcularDepreciacion(@Param('id') id: string, @Body() dto: DepreciacionMesDto) {
    return this.activosService.calcularDepreciacionMes(id, dto.mes, dto.anio);
  }
}
