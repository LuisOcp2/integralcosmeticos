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
import { CambiarEtapaDto } from './dto/cambiar-etapa.dto';
import { CrearOportunidadDto } from './dto/crear-oportunidad.dto';
import { OportunidadesService } from './oportunidades.service';

@ApiTags('crm-oportunidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/oportunidades')
export class OportunidadesController {
  constructor(private readonly oportunidadesService: OportunidadesService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Crear oportunidad' })
  create(@Body() dto: CrearOportunidadDto, @Request() req: any) {
    return this.oportunidadesService.create(dto, req.user.id);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar oportunidades con filtros' })
  findAll(@Query() filtros: any) {
    return this.oportunidadesService.findAll(filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener oportunidad por id' })
  findOne(@Param('id') id: string) {
    return this.oportunidadesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Actualizar oportunidad' })
  update(@Param('id') id: string, @Body() dto: Partial<CrearOportunidadDto>) {
    return this.oportunidadesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar oportunidad' })
  remove(@Param('id') id: string) {
    return this.oportunidadesService.remove(id);
  }

  @Patch(':id/etapa')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Cambiar etapa de oportunidad y registrar actividad automatica' })
  cambiarEtapa(@Param('id') id: string, @Body() dto: CambiarEtapaDto) {
    return this.oportunidadesService.cambiarEtapa(id, dto.etapa, dto.nota);
  }
}
