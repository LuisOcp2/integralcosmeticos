import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CerrarCajaSedeDto } from './dto/cerrar-caja-sede.dto';
import { CajaService } from './caja.service';

@ApiTags('caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('abrir')
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Abrir caja para una sede' })
  abrirCaja(@Body() dto: AbrirCajaDto, @Request() req: any) {
    return this.cajaService.abrirCaja(dto.sedeId, req.user.id, dto.montoInicial);
  }

  @Post('apertura')
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Alias documental para abrir caja' })
  abrirCajaAlias(@Body() dto: AbrirCajaDto, @Request() req: any) {
    return this.cajaService.abrirCaja(dto.sedeId, req.user.id, dto.montoInicial);
  }

  @Post('cierre')
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Cerrar caja activa por sede con arqueo final' })
  cerrarCajaPorSede(@Body() dto: CerrarCajaSedeDto, @Request() req: any) {
    return this.cajaService.cerrarCajaActivaPorSede(dto.sedeId, req.user.id, dto.montoFinal);
  }

  @Post(':id/cerrar')
  @Roles(Rol.CAJERO)
  @ApiOperation({ summary: 'Cerrar caja con arqueo final' })
  cerrarCaja(@Param('id') cajaId: string, @Body() dto: CerrarCajaDto, @Request() req: any) {
    return this.cajaService.cerrarCaja(cajaId, req.user.id, dto.montoFinal);
  }

  @Get('activa/:sedeId')
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar caja activa por sede' })
  getCajaActiva(@Param('sedeId') sedeId: string) {
    return this.cajaService.getCajaAbierta(sedeId);
  }

  @Get('historial/:sedeId')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener historial de cajas por sede' })
  getHistorial(@Param('sedeId') sedeId: string) {
    return this.cajaService.getHistorial(sedeId);
  }
}
