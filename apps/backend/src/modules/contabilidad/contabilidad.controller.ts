import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BalanceGeneralQueryDto } from './dto/balance-general-query.dto';
import { CierreMesDto } from './dto/cierre-mes.dto';
import { EstadoResultadosQueryDto } from './dto/estado-resultados-query.dto';
import { ExportarSiigoQueryDto } from './dto/exportar-siigo-query.dto';
import { LibroMayorQueryDto } from './dto/libro-mayor-query.dto';
import { ContabilidadService } from './contabilidad.service';

@ApiTags('contabilidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contabilidad')
export class ContabilidadController {
  constructor(private readonly contabilidadService: ContabilidadService) {}

  @Get('balance-general')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Balance general: activos vs pasivos + patrimonio' })
  balanceGeneral(@Query() query: BalanceGeneralQueryDto) {
    return this.contabilidadService.balanceGeneral(query.fecha);
  }

  @Get('estado-resultados')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Estado de resultados por rango de fechas' })
  estadoResultados(@Query() query: EstadoResultadosQueryDto) {
    return this.contabilidadService.estadoResultados(query.fechaDesde, query.fechaHasta);
  }

  @Get('libro-mayor')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Libro mayor por cuenta y rango de fechas' })
  libroMayor(@Query() query: LibroMayorQueryDto) {
    return this.contabilidadService.libroMayor(query.cuentaId, query.fechaDesde, query.fechaHasta);
  }

  @Get('exportar-siigo')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Exportar comprobantes en formato compatible con Siigo' })
  @ApiQuery({ name: 'mes', required: true, type: Number })
  @ApiQuery({ name: 'ano', required: true, type: Number })
  exportarSiigo(@Query() query: ExportarSiigoQueryDto) {
    return this.contabilidadService.exportarSiigo(query.mes, query.ano);
  }

  @Post('cierre-mes')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Cierre contable mensual y bloqueo de periodo' })
  cierreMes(@Body() dto: CierreMesDto, @Request() req: any) {
    return this.contabilidadService.cierreMes(dto.mes, dto.ano, req.user.id);
  }
}
