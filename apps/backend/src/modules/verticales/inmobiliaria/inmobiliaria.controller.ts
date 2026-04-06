import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { CreateInmuebleDto } from './dto/create-inmueble.dto';
import { FiltrosInmueblesDto } from './dto/filtros-inmuebles.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { UpdateInmuebleDto } from './dto/update-inmueble.dto';
import { InmobiliariaService } from './inmobiliaria.service';

@ApiTags('verticales-inmobiliaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('verticales/inmobiliaria')
export class InmobiliariaController {
  constructor(private readonly inmobiliariaService: InmobiliariaService) {}

  @Post('inmuebles')
  @ApiOperation({ summary: 'Crear inmueble' })
  createInmueble(@Body() dto: CreateInmuebleDto, @Request() req: any) {
    return this.inmobiliariaService.createInmueble(dto, req.user?.empresaId ?? null);
  }

  @Get('inmuebles')
  @ApiOperation({ summary: 'Listar inmuebles con filtros' })
  findInmuebles(@Query() filtros: FiltrosInmueblesDto, @Request() req: any) {
    return this.inmobiliariaService.findInmuebles(filtros, req.user?.empresaId ?? null);
  }

  @Get('inmuebles/:id')
  @ApiOperation({ summary: 'Obtener inmueble por id' })
  findOneInmueble(@Param('id') id: string, @Request() req: any) {
    return this.inmobiliariaService.findOneInmueble(id, req.user?.empresaId ?? null);
  }

  @Put('inmuebles/:id')
  @ApiOperation({ summary: 'Actualizar inmueble' })
  updateInmueble(@Param('id') id: string, @Body() dto: UpdateInmuebleDto, @Request() req: any) {
    return this.inmobiliariaService.updateInmueble(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('inmuebles/:id')
  @ApiOperation({ summary: 'Eliminar inmueble' })
  removeInmueble(@Param('id') id: string, @Request() req: any) {
    return this.inmobiliariaService.removeInmueble(id, req.user?.empresaId ?? null);
  }

  @Post('contratos')
  @ApiOperation({ summary: 'Crear contrato de arrendamiento' })
  createContrato(@Body() dto: CreateContratoDto, @Request() req: any) {
    return this.inmobiliariaService.createContrato(dto, req.user?.empresaId ?? null);
  }

  @Get('contratos')
  @ApiOperation({ summary: 'Listar contratos' })
  findContratos(@Request() req: any) {
    return this.inmobiliariaService.findContratos(req.user?.empresaId ?? null);
  }

  @Get('contratos/:id')
  @ApiOperation({ summary: 'Obtener contrato por id' })
  findContrato(@Param('id') id: string, @Request() req: any) {
    return this.inmobiliariaService.findContrato(id, req.user?.empresaId ?? null);
  }

  @Put('contratos/:id')
  @ApiOperation({ summary: 'Actualizar contrato' })
  updateContrato(@Param('id') id: string, @Body() dto: UpdateContratoDto, @Request() req: any) {
    return this.inmobiliariaService.updateContrato(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('contratos/:id')
  @ApiOperation({ summary: 'Eliminar contrato' })
  removeContrato(@Param('id') id: string, @Request() req: any) {
    return this.inmobiliariaService.removeContrato(id, req.user?.empresaId ?? null);
  }

  @Post('pagos/registrar')
  @ApiOperation({ summary: 'Registrar pago de arriendo' })
  registrarPago(@Body() dto: RegistrarPagoDto, @Request() req: any) {
    return this.inmobiliariaService.registrarPago(
      dto.contratoId,
      dto.mes,
      dto.anio,
      dto.monto,
      req.user?.empresaId ?? null,
    );
  }

  @Get('pagos/pendientes')
  @ApiOperation({ summary: 'Consultar pagos pendientes/vencidos' })
  getPagosPendientes(@Query('contratoId') contratoId: string | undefined, @Request() req: any) {
    return this.inmobiliariaService.getPagosPendientes(contratoId, req.user?.empresaId ?? null);
  }

  @Get('ingresos-mensual')
  @ApiOperation({ summary: 'Resumen ingresos mensual' })
  getIngresosMensual(@Query('mes') mes: string, @Query('anio') anio: string, @Request() req: any) {
    return this.inmobiliariaService.getIngresosMensual(
      Number(mes),
      Number(anio),
      req.user?.empresaId ?? null,
    );
  }

  @Post('pagos/generar-mes')
  @ApiOperation({ summary: 'Generar pagos del mes actual' })
  generarPagosMes() {
    return this.inmobiliariaService.generarPagosDelMes();
  }
}
