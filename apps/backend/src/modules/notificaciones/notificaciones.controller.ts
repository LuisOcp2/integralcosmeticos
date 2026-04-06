import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesQueryDto } from './dto/notificaciones-query.dto';
import { UpdateConfiguracionNotificacionDto } from './dto/update-configuracion-notificacion.dto';

@ApiTags('notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  getMisNotificaciones(@CurrentUser() user: AuthUser, @Query() query: NotificacionesQueryDto) {
    return this.notificacionesService.getMisNotificaciones(user.id, query);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de notificaciones del usuario' })
  getResumen(@CurrentUser() user: AuthUser) {
    return this.notificacionesService.getResumen(user.id);
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar notificacion como leida' })
  marcarLeida(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificacionesService.marcarLeida(id, user.id);
  }

  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leidas' })
  marcarTodasLeidas(@CurrentUser() user: AuthUser) {
    return this.notificacionesService.marcarTodasLeidas(user.id);
  }

  @Get('configuracion')
  @ApiOperation({ summary: 'Obtener configuracion de notificaciones' })
  getConfiguracion(@CurrentUser() user: AuthUser) {
    return this.notificacionesService.getConfiguracion(user.id);
  }

  @Patch('configuracion')
  @ApiOperation({ summary: 'Actualizar configuracion de notificaciones' })
  updateConfiguracion(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateConfiguracionNotificacionDto,
  ) {
    return this.notificacionesService.updateConfiguracion(user.id, {
      ...dto,
      silenciadoHasta:
        dto.silenciadoHasta === undefined
          ? undefined
          : dto.silenciadoHasta
            ? new Date(dto.silenciadoHasta)
            : null,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async limpiarExpiradasCron() {
    await this.notificacionesService.eliminarExpiradas();
  }
}
