import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CambiarPlanDto } from './dto/cambiar-plan.dto';
import { CrearEmpresaDto } from './dto/crear-empresa.dto';
import { ResultadoActividad } from './entities/log-actividad.entity';
import { SuspenderEmpresaDto } from './dto/suspender-empresa.dto';
import { SuperadminService } from './superadmin.service';

@ApiTags('superadmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('empresas')
  @ApiOperation({ summary: 'Listar empresas con usuarios activos' })
  getEmpresas() {
    return this.superadminService.getTodasEmpresas();
  }

  @Post('empresas')
  @ApiOperation({ summary: 'Crear empresa y admin inicial' })
  crearEmpresa(@Body() dto: CrearEmpresaDto) {
    return this.superadminService.crearEmpresa(dto);
  }

  @Patch('empresas/:id/plan')
  @ApiOperation({ summary: 'Cambiar plan de empresa' })
  cambiarPlan(@Param('id') empresaId: string, @Body() dto: CambiarPlanDto) {
    return this.superadminService.cambiarPlan(empresaId, dto.plan, dto.vencimientoEn);
  }

  @Patch('empresas/:id/suspender')
  @ApiOperation({ summary: 'Suspender empresa' })
  suspender(@Param('id') empresaId: string, @Body() dto: SuspenderEmpresaDto) {
    return this.superadminService.suspender(empresaId, dto.motivo);
  }

  @Patch('empresas/:id/reactivar')
  @ApiOperation({ summary: 'Reactivar empresa' })
  reactivar(@Param('id') empresaId: string) {
    return this.superadminService.reactivar(empresaId);
  }

  @Get('metricas')
  @ApiOperation({ summary: 'Metricas globales de empresas' })
  getMetricas() {
    return this.superadminService.getMetricasGlobales();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Logs globales de actividad' })
  getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('modulo') modulo?: string,
    @Query('resultado') resultado?: ResultadoActividad,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.superadminService.getLogs(page, limit, {
      modulo,
      resultado,
      fechaDesde,
      fechaHasta,
    });
  }
}
