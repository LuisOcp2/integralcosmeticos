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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear workflow' })
  create(@Body() dto: CreateWorkflowDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.workflowsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar workflows' })
  findAll(@Query() query: WorkflowQueryDto) {
    return this.workflowsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener workflow por id' })
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar workflow' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar workflow' })
  remove(@Param('id') id: string) {
    return this.workflowsService.remove(id);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Historial de ejecuciones de workflow' })
  getHistorial(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.workflowsService.getHistorial(id, Number(page), Number(limit));
  }

  @Post(':id/ejecutar-prueba')
  @ApiOperation({ summary: 'Ejecutar prueba de workflow con contexto libre' })
  ejecutarPrueba(@Param('id') id: string, @Body() contexto: Record<string, unknown>) {
    return this.workflowsService.ejecutarPrueba(id, contexto);
  }

  @Get(':id/estadisticas')
  @ApiOperation({ summary: 'Obtener estadisticas del workflow' })
  getEstadisticas(@Param('id') id: string) {
    return this.workflowsService.getEstadisticas(id);
  }
}
