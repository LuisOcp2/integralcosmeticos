import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventarioService } from './inventario.service';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { TrasladarStockDto } from './dto/trasladar-stock.dto';

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
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  getMovimientos() {
    return this.inventarioService.getMovimientos();
  }
}
