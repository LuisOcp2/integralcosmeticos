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

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar clientes activos' })
  findAll() {
    return this.clientesService.findAll();
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
  getHistorial(@Param('id') id: string) {
    return this.clientesService.getHistorialCompras(id);
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
