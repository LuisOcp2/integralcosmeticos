import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NominaService } from './nomina.service';
import { CalcularNominaDto } from '../dto/calcular-nomina.dto';
import { FiltrosNominaColectivaDto } from '../dto/filtros-nomina-colectiva.dto';

@ApiTags('rrhh-nomina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('rrhh/nomina')
export class NominaController {
  constructor(private readonly nominaService: NominaService) {}

  @Post('calcular')
  @ApiOperation({ summary: 'Calcular nomina colectiva del periodo' })
  calcularNomina(@Body() dto: CalcularNominaDto) {
    return this.nominaService.calcularNominaColectiva(dto.mes, dto.ano, dto.sedeId);
  }

  @Get('colectivas')
  @ApiOperation({ summary: 'Listar nominas colectivas' })
  async listarColectivas(@Query() _query: FiltrosNominaColectivaDto) {
    return this.nominaService.getNominasColectivas();
  }

  @Get('colectivas/:id')
  @ApiOperation({ summary: 'Obtener nomina colectiva con liquidaciones' })
  getColectivaById(@Param('id') id: string) {
    return this.nominaService.getNominaColectivaById(id);
  }

  @Patch('colectivas/:id/aprobar')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Aprobar nomina colectiva' })
  aprobarNomina(@Param('id') id: string, @Req() req: any) {
    return this.nominaService.aprobarNomina(id, req.user.id, req.user.rol);
  }

  @Get('liquidaciones/:id/colilla')
  @ApiOperation({ summary: 'Generar colilla de pago en texto' })
  generarColilla(@Param('id') id: string) {
    return this.nominaService.generarColillaTexto(id);
  }
}
