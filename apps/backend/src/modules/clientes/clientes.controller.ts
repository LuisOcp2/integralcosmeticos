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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ActualizarPuntosDto } from './dto/actualizar-puntos.dto';
import { ClientesQueryDto } from './dto/clientes-query.dto';
import { RegistrarCompraClienteDto } from './dto/registrar-compra-cliente.dto';
import { HistorialComprasQueryDto } from './dto/historial-compras-query.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClienteDto, @Request() req: any) {
    return this.clientesService.create({
      ...dto,
      sedeRegistroId: dto.sedeRegistroId ?? req.user?.sedeId ?? null,
    });
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar clientes activos con paginacion y filtros' })
  findAll(@Query() query: ClientesQueryDto) {
    return this.clientesService.findAll(query);
  }

  @Get('segmentos')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener segmentos VIP, FRECUENTE, NUEVO e INACTIVO' })
  getSegmentos() {
    return this.clientesService.getSegmentos();
  }

  @Get('frecuentes/top')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener clientes frecuentes ordenados por total de compras' })
  getFrecuentes(@Query('sedeId') sedeId?: string, @Query('top') top?: string) {
    return this.clientesService.getClientesFrecuentes(sedeId, top ? Number(top) : undefined);
  }

  @Get('cumpleanios/hoy')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Obtener clientes que cumplen anos hoy' })
  getCumpleaniosHoy() {
    return this.clientesService.getCumpleaniosHoy();
  }

  @Get('estadisticas/resumen')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener estadisticas de clientes CRM' })
  getEstadisticas() {
    return this.clientesService.getEstadisticas();
  }

  @Get('documento/:documento')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar cliente por documento' })
  findByDocumento(@Param('documento') documento: string) {
    return this.clientesService.findByDocumento(documento);
  }

  @Get('buscar/:doc')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar cliente por documento (alias documental)' })
  findByDocumentoAlias(@Param('doc') doc: string) {
    return this.clientesService.findByDocumento(doc);
  }

  @Get('buscar')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar cliente por documento (query: doc)' })
  findByDocumentoQuery(@Query('doc') doc?: string) {
    if (!doc) {
      return null;
    }
    return this.clientesService.findByDocumento(doc);
  }

  @Get(':id/historial')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Consultar historial de compras de un cliente' })
  getHistorial(@Param('id') id: string, @Query() query: HistorialComprasQueryDto) {
    return this.clientesService.getHistorialCompras(id, query.page, query.limit);
  }

  @Post(':id/registrar-compra')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Registrar compra y acumular total, cantidad y puntos del cliente' })
  registrarCompra(@Param('id') id: string, @Body() dto: RegistrarCompraClienteDto) {
    return this.clientesService.registrarCompra(id, dto.montoTotal);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener cliente por id con historial' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOneConHistorial(id);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  remove(@Param('id') id: string) {
    return this.clientesService.remove(id);
  }

  @Patch(':id/puntos')
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Actualizar puntos de fidelidad del cliente' })
  updatePuntos(@Param('id') id: string, @Body() dto: ActualizarPuntosDto) {
    return this.clientesService.setPuntos(id, dto.puntos);
  }
}
