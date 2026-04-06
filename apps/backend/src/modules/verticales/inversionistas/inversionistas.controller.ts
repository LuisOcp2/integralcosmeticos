import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { ActualizarPreciosLoteDto } from './dto/actualizar-precios-lote.dto';
import { CreateInversionItemDto } from './dto/create-inversion-item.dto';
import { CreateInversionistaDto } from './dto/create-inversionista.dto';
import { CreateMovimientoInversionDto } from './dto/create-movimiento-inversion.dto';
import { CreatePortafolioDto } from './dto/create-portafolio.dto';
import { UpdateInversionItemDto } from './dto/update-inversion-item.dto';
import { UpdateInversionistaDto } from './dto/update-inversionista.dto';
import { UpdateMovimientoInversionDto } from './dto/update-movimiento-inversion.dto';
import { UpdatePortafolioDto } from './dto/update-portafolio.dto';
import { InversionistasService } from './inversionistas.service';

@ApiTags('verticales-inversionistas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('verticales/inversionistas')
export class InversionistasController {
  constructor(private readonly inversionistasService: InversionistasService) {}

  @Post('inversionistas')
  @ApiOperation({ summary: 'Crear inversionista' })
  createInversionista(@Body() dto: CreateInversionistaDto, @Request() req: any) {
    return this.inversionistasService.createInversionista(dto, req.user?.empresaId ?? null);
  }

  @Get('inversionistas')
  @ApiOperation({ summary: 'Listar inversionistas' })
  findInversionistas(@Request() req: any) {
    return this.inversionistasService.findInversionistas(req.user?.empresaId ?? null);
  }

  @Get('inversionistas/:id')
  @ApiOperation({ summary: 'Obtener inversionista por id' })
  findInversionista(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.findInversionista(id, req.user?.empresaId ?? null);
  }

  @Put('inversionistas/:id')
  @ApiOperation({ summary: 'Actualizar inversionista' })
  updateInversionista(
    @Param('id') id: string,
    @Body() dto: UpdateInversionistaDto,
    @Request() req: any,
  ) {
    return this.inversionistasService.updateInversionista(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('inversionistas/:id')
  @ApiOperation({ summary: 'Eliminar inversionista' })
  removeInversionista(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.removeInversionista(id, req.user?.empresaId ?? null);
  }

  @Post('portafolios')
  @ApiOperation({ summary: 'Crear portafolio' })
  createPortafolio(@Body() dto: CreatePortafolioDto, @Request() req: any) {
    return this.inversionistasService.createPortafolio(dto, req.user?.empresaId ?? null);
  }

  @Get('portafolios')
  @ApiOperation({ summary: 'Listar portafolios' })
  findPortafolios(@Request() req: any) {
    return this.inversionistasService.findPortafolios(req.user?.empresaId ?? null);
  }

  @Get('portafolios/:id')
  @ApiOperation({ summary: 'Obtener portafolio por id' })
  findPortafolio(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.findPortafolio(id, req.user?.empresaId ?? null);
  }

  @Put('portafolios/:id')
  @ApiOperation({ summary: 'Actualizar portafolio' })
  updatePortafolio(@Param('id') id: string, @Body() dto: UpdatePortafolioDto, @Request() req: any) {
    return this.inversionistasService.updatePortafolio(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('portafolios/:id')
  @ApiOperation({ summary: 'Eliminar portafolio' })
  removePortafolio(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.removePortafolio(id, req.user?.empresaId ?? null);
  }

  @Post('items')
  @ApiOperation({ summary: 'Crear item de inversion' })
  createItem(@Body() dto: CreateInversionItemDto, @Request() req: any) {
    return this.inversionistasService.createItem(dto, req.user?.empresaId ?? null);
  }

  @Get('items')
  @ApiOperation({ summary: 'Listar items de inversion' })
  findItems(@Query('portafolioId') portafolioId: string | undefined, @Request() req: any) {
    return this.inversionistasService.findItems(portafolioId, req.user?.empresaId ?? null);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Obtener item por id' })
  findItem(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.findItem(id, req.user?.empresaId ?? null);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Actualizar item' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateInversionItemDto, @Request() req: any) {
    return this.inversionistasService.updateItem(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Eliminar item' })
  removeItem(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.removeItem(id, req.user?.empresaId ?? null);
  }

  @Post('movimientos')
  @ApiOperation({ summary: 'Crear movimiento de inversion' })
  createMovimiento(@Body() dto: CreateMovimientoInversionDto, @Request() req: any) {
    return this.inversionistasService.createMovimiento(dto, req.user?.empresaId ?? null);
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Listar movimientos de inversion' })
  findMovimientos(@Query('itemId') itemId: string | undefined, @Request() req: any) {
    return this.inversionistasService.findMovimientos(itemId, req.user?.empresaId ?? null);
  }

  @Get('movimientos/:id')
  @ApiOperation({ summary: 'Obtener movimiento por id' })
  findMovimiento(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.findMovimiento(id, req.user?.empresaId ?? null);
  }

  @Put('movimientos/:id')
  @ApiOperation({ summary: 'Actualizar movimiento' })
  updateMovimiento(
    @Param('id') id: string,
    @Body() dto: UpdateMovimientoInversionDto,
    @Request() req: any,
  ) {
    return this.inversionistasService.updateMovimiento(id, dto, req.user?.empresaId ?? null);
  }

  @Delete('movimientos/:id')
  @ApiOperation({ summary: 'Eliminar movimiento' })
  removeMovimiento(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.removeMovimiento(id, req.user?.empresaId ?? null);
  }

  @Get('portafolios/:id/resumen')
  @ApiOperation({ summary: 'Resumen financiero del portafolio' })
  getResumenPortafolio(@Param('id') id: string, @Request() req: any) {
    return this.inversionistasService.getResumenPortafolio(id, req.user?.empresaId ?? null);
  }

  @Patch('portafolios/:id/actualizar-precios')
  @ApiOperation({ summary: 'Actualizar precios por lote' })
  actualizarPreciosLote(
    @Param('id') id: string,
    @Body() dto: ActualizarPreciosLoteDto,
    @Request() req: any,
  ) {
    return this.inversionistasService.actualizarPreciosLote(id, dto, req.user?.empresaId ?? null);
  }

  @Get('items/vencimientos-proximos')
  @ApiOperation({ summary: 'Listar vencimientos proximos de CDT y bonos' })
  getVencimientosProximos(
    @Query('dias', new DefaultValuePipe(30), ParseIntPipe) dias: number,
    @Request() req: any,
  ) {
    return this.inversionistasService.getVencimientosProximos(dias, req.user?.empresaId ?? null);
  }
}
