import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventarioService } from './inventario.service';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { TrasladarStockDto } from './dto/trasladar-stock.dto';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { OperarStockDto } from './dto/operar-stock.dto';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { FiltrosMovimientoDto } from './dto/filtros-movimiento.dto';

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('movimientos')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  registrarMovimiento(@Body() dto: RegistrarMovimientoDto, @Request() req: any) {
    return this.inventarioService.registrarMovimiento(dto, req.user.id);
  }

  @Get('stock/:sedeId')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO, Rol.CAJERO)
  @ApiOperation({ summary: 'Consultar stock por sede con alertas de minimo' })
  getStockPorSede(@Param('sedeId') sedeId: string) {
    return this.inventarioService.getStockPorSede(sedeId);
  }

  @Post('traslados')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Trasladar stock entre sedes en transaccion atomica' })
  trasladar(@Body() dto: TrasladarStockDto, @Request() req: any) {
    return this.inventarioService.trasladar(dto, req.user.id);
  }

  @Get('movimientos')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar movimientos de inventario con filtros y paginacion' })
  getMovimientos(@Query() filtros: FiltrosMovimientoDto) {
    return this.inventarioService.generarReporteMovimientos(filtros);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO, Rol.CAJERO)
  @ApiOperation({ summary: 'Stock actual por sede (query: sedeId)' })
  getInventario(@Request() req: any) {
    const sedeId = req.query?.sedeId as string | undefined;
    if (!sedeId) {
      throw new BadRequestException('Debe enviar sedeId en query');
    }
    return this.inventarioService.getStockPorSede(sedeId);
  }

  @Get('alertas')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO, Rol.CAJERO)
  @ApiOperation({ summary: 'Alertas activas de inventario (query opcional: sedeId)' })
  getAlertas(@Request() req: any) {
    const sedeId = req.query?.sedeId as string | undefined;
    return this.inventarioService.getAlertasActivas(sedeId);
  }

  @Get('valorizado')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({
    summary: 'Inventario valorizado agrupado por categoria (query opcional: sedeId)',
  })
  getInventarioValorizado(@Query('sedeId') sedeId?: string) {
    return this.inventarioService.getInventarioValorizado(sedeId);
  }

  @Post('entrada')
  @Roles(Rol.BODEGUERO)
  @ApiOperation({ summary: 'Registrar entrada de inventario' })
  entrada(@Body() dto: OperarStockDto, @Request() req: any) {
    return this.inventarioService.registrarMovimiento(
      {
        tipo: TipoMovimiento.ENTRADA,
        varianteId: dto.varianteId,
        sedeDestinoId: dto.sedeId,
        cantidad: dto.cantidad,
        motivo: dto.motivo,
      },
      req.user.id,
    );
  }

  @Post('salida')
  @Roles(Rol.BODEGUERO)
  @ApiOperation({ summary: 'Registrar salida de inventario' })
  salida(@Body() dto: OperarStockDto, @Request() req: any) {
    return this.inventarioService.registrarMovimiento(
      {
        tipo: TipoMovimiento.SALIDA,
        varianteId: dto.varianteId,
        sedeOrigenId: dto.sedeId,
        cantidad: dto.cantidad,
        motivo: dto.motivo,
      },
      req.user.id,
    );
  }

  @Post('traslado')
  @Roles(Rol.BODEGUERO)
  @ApiOperation({ summary: 'Alias de traslado entre sedes' })
  trasladoAlias(@Body() dto: TrasladarStockDto, @Request() req: any) {
    return this.inventarioService.trasladar(dto, req.user.id);
  }

  @Post('ajuste')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Ajustar stock con motivo operacional' })
  ajustarStock(@Body() dto: AjustarStockDto, @Request() req: any) {
    return this.inventarioService.ajustarStock(dto, req.user.id);
  }
}
