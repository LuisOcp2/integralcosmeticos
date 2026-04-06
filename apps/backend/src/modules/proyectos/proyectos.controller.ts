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
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { ProyectosQueryDto } from './dto/proyectos-query.dto';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { CreateComentarioTareaDto } from './dto/create-comentario-tarea.dto';
import { CambiarEstadoTareaDto } from './dto/cambiar-estado-tarea.dto';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';

@ApiTags('proyectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear proyecto' })
  create(@Body() dto: CreateProyectoDto) {
    return this.proyectosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proyectos con paginacion' })
  findAll(@Query() query: ProyectosQueryDto) {
    return this.proyectosService.findAll(query);
  }

  @Get('mis-tareas')
  @ApiOperation({ summary: 'Listar tareas del usuario autenticado' })
  getMisTareas(@Request() req: any) {
    return this.proyectosService.getMisTareas(req.user.id);
  }

  @Get('empleados')
  @ApiOperation({ summary: 'Listar empleados para asignacion de tareas (fallback seguro)' })
  getEmpleados(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ) {
    return this.proyectosService.getEmpleadosDisponibles(page, limit);
  }

  @Get(':id/kanban')
  @ApiOperation({ summary: 'Obtener kanban por proyecto' })
  getKanban(@Param('id') id: string) {
    return this.proyectosService.getKanban(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyecto por id' })
  findOne(@Param('id') id: string) {
    return this.proyectosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(@Param('id') id: string, @Body() dto: UpdateProyectoDto) {
    return this.proyectosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proyecto' })
  remove(@Param('id') id: string) {
    return this.proyectosService.remove(id);
  }

  @Post(':id/calcular-avance')
  @ApiOperation({ summary: 'Calcular avance del proyecto' })
  calcularAvance(@Param('id') id: string) {
    return this.proyectosService.calcularAvance(id);
  }

  @Get(':id/tareas')
  @ApiOperation({ summary: 'Listar tareas del proyecto' })
  findTareas(@Param('id') id: string) {
    return this.proyectosService.findTareas(id);
  }

  @Post(':id/tareas')
  @ApiOperation({ summary: 'Crear tarea en proyecto' })
  createTarea(@Param('id') id: string, @Body() dto: CreateTareaDto, @Request() req: any) {
    return this.proyectosService.createTarea(id, dto, req.user.id);
  }

  @Get(':id/tareas/:tareaId')
  @ApiOperation({ summary: 'Obtener tarea por id' })
  findTarea(@Param('id') id: string, @Param('tareaId') tareaId: string) {
    return this.proyectosService.findTarea(id, tareaId);
  }

  @Put(':id/tareas/:tareaId')
  @ApiOperation({ summary: 'Actualizar tarea' })
  updateTarea(
    @Param('id') id: string,
    @Param('tareaId') tareaId: string,
    @Body() dto: UpdateTareaDto,
  ) {
    return this.proyectosService.updateTarea(id, tareaId, dto);
  }

  @Delete(':id/tareas/:tareaId')
  @ApiOperation({ summary: 'Eliminar tarea' })
  deleteTarea(@Param('id') id: string, @Param('tareaId') tareaId: string) {
    return this.proyectosService.deleteTarea(id, tareaId);
  }

  @Post(':id/tareas/:tareaId/comentarios')
  @ApiOperation({ summary: 'Agregar comentario en tarea' })
  addComentario(
    @Param('id') id: string,
    @Param('tareaId') tareaId: string,
    @Body() dto: CreateComentarioTareaDto,
    @Request() req: any,
  ) {
    return this.proyectosService.addComentario(id, tareaId, dto.texto, req.user.id);
  }

  @Patch(':id/tareas/:tareaId/estado')
  @ApiOperation({ summary: 'Cambiar estado de tarea' })
  cambiarEstado(
    @Param('id') id: string,
    @Param('tareaId') tareaId: string,
    @Body() dto: CambiarEstadoTareaDto,
  ) {
    return this.proyectosService.cambiarEstadoTarea(id, tareaId, dto.estado);
  }

  @Post(':id/tareas/:tareaId/registrar-horas')
  @ApiOperation({ summary: 'Registrar horas en tarea' })
  registrarHoras(
    @Param('id') id: string,
    @Param('tareaId') tareaId: string,
    @Body() dto: RegistrarHorasDto,
  ) {
    return this.proyectosService.registrarHoras(id, tareaId, dto.horas);
  }
}
