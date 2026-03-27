import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.CAJERO, Rol.SUPERVISOR)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes activos' })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get('documento/:documento')
  @ApiOperation({ summary: 'Buscar cliente por documento' })
  findByDocumento(@Param('documento') documento: string) {
    return this.clientesService.findByDocumento(documento);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Consultar historial de compras de un cliente' })
  getHistorial(@Param('id') id: string) {
    return this.clientesService.getHistorialCompras(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por id' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }
}
