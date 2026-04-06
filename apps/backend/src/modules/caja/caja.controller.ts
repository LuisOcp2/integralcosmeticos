import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
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
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Abrir caja para una sede' })
  abrirCaja(@Body() dto: AbrirCajaDto, @Request() req: any) {
    const montoApertura = dto.montoApertura ?? dto.montoInicial;
    if (montoApertura === undefined) {
      throw new BadRequestException('montoApertura es requerido');
    }
    return this.cajaService.abrirCaja(req.user.sedeId, req.user.id, montoApertura);
  }

  @Post('apertura')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Alias documental para abrir caja' })
  abrirCajaAlias(@Body() dto: AbrirCajaDto, @Request() req: any) {
    const montoApertura = dto.montoApertura ?? dto.montoInicial;
    if (montoApertura === undefined) {
      throw new BadRequestException('montoApertura es requerido');
    }
    return this.cajaService.abrirCaja(req.user.sedeId, req.user.id, montoApertura);
  }

  @Post('cierre')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Cerrar caja activa por sede con arqueo final' })
  cerrarCajaPorSede(@Body() dto: CerrarCajaSedeDto, @Request() req: any) {
    const montoCierre = dto.montoCierre ?? dto.montoFinal;
    if (montoCierre === undefined) {
      throw new BadRequestException('montoCierre es requerido');
    }
    return this.cajaService.cerrarCajaActivaPorSede(
      dto.sedeId,
      req.user.id,
      montoCierre,
      dto.notas,
    );
  }

  @Post(':id/cerrar')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)
  @ApiOperation({ summary: 'Cerrar caja con arqueo final' })
  cerrarCaja(@Param('id') cajaId: string, @Body() dto: CerrarCajaDto, @Request() req: any) {
    const montoCierre = dto.montoCierre ?? dto.montoFinal;
    if (montoCierre === undefined) {
      throw new BadRequestException('montoCierre es requerido');
    }
    return this.cajaService.cerrarCaja(cajaId, req.user.id, montoCierre, dto.notas);
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
