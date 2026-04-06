import {
  Body,
  Controller,
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
import { ActividadesService } from './actividades.service';
import { CrearActividadDto } from './dto/crear-actividad.dto';

@ApiTags('crm-actividades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Crear actividad CRM' })
  create(@Body() dto: CrearActividadDto, @Request() req: any) {
    return this.actividadesService.create(dto, req.user.id);
  }

  @Get('pendientes')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar actividades pendientes con fecha proxima <= hoy + 3 dias' })
  getPendientes() {
    return this.actividadesService.getPendientes();
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar actividades CRM con filtros' })
  findAll(@Query() filtros: any) {
    return this.actividadesService.findAll(filtros);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Completar actividad y registrar resultado' })
  completar(@Param('id') id: string, @Body('resultado') resultado?: string) {
    return this.actividadesService.completar(id, resultado);
  }
}
