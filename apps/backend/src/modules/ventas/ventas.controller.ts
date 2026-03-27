import { Body, Controller, Get, Param, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Crear venta y afectar inventario' })
  create(@Body() dto: CreateVentaDto, @Request() req: any) {
    return this.ventasService.crearVenta(dto, req.user.id);
  }

  @Post(':id/anular')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Anular venta y devolver stock' })
  anular(@Param('id') id: string, @Body() dto: AnularVentaDto, @Request() req: any) {
    return this.ventasService.anularVenta(id, dto, req.user.id);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar ventas por sede y fecha' })
  @ApiQuery({ name: 'sedeId', required: false, type: String })
  @ApiQuery({ name: 'fecha', required: false, type: String })
  findAll(@Query('sedeId') sedeId?: string, @Query('fecha') fecha?: string) {
    return this.ventasService.getVentasByFecha(sedeId, fecha);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener venta por id' })
  findOne(@Param('id') id: string) {
    return this.ventasService.getVentaById(id);
  }

  @Get(':id/ticket')
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Generar ticket PDF de venta' })
  async getTicket(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.ventasService.generarTicketPDF(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=ticket-${id}.pdf`);
    res.send(pdf);
  }
}
