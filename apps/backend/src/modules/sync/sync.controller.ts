import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SyncService } from './sync.service';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de sincronizacion cloud' })
  getStatus() {
    return this.syncService.getSyncStatus();
  }

  @Post('forzar')
  @ApiOperation({ summary: 'Forzar sincronizacion inmediata de tablas criticas' })
  forzarSync() {
    return this.syncService.forzarSyncInmediato();
  }
}
