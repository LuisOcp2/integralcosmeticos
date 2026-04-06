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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LeadsService } from './leads.service';
import { CrearLeadDto } from './dto/crear-lead.dto';
import { ActualizarLeadDto } from './dto/actualizar-lead.dto';
import { FiltrosLeadDto } from './dto/filtros-lead.dto';

@ApiTags('crm-leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Crear lead' })
  create(@Body() dto: CrearLeadDto, @Request() req: any) {
    return this.leadsService.create(dto, req.user.id);
  }

  @Get('kanban')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener oportunidades agrupadas por etapa para kanban' })
  getKanbanOportunidades() {
    return this.leadsService.getKanbanOportunidades();
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar leads con filtros' })
  findAll(@Query() filtros: FiltrosLeadDto) {
    return this.leadsService.findAll(filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener lead por id' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Actualizar lead' })
  update(@Param('id') id: string, @Body() dto: ActualizarLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar lead' })
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Post(':id/convertir-cliente')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Convertir lead a cliente y marcarlo como ganado' })
  convertirACliente(@Param('id') id: string) {
    return this.leadsService.convertirACliente(id);
  }
}
