import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConfigurarIntegracionDto } from './dto/configurar-integracion.dto';
import { TipoIntegracion } from './entities/integracion-config.entity';
import { IntegracionesService } from './integraciones.service';

@ApiTags('integraciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('integraciones')
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar integraciones sin credenciales' })
  getAll() {
    return this.integracionesService.getAll();
  }

  @Post(':tipo/configurar')
  @ApiOperation({ summary: 'Configurar integracion y cifrar credenciales' })
  configurar(@Param('tipo') tipo: TipoIntegracion, @Body() dto: ConfigurarIntegracionDto) {
    return this.integracionesService.configurar(tipo, dto);
  }

  @Post(':tipo/test')
  @ApiOperation({ summary: 'Probar conexion de integracion' })
  test(@Param('tipo') tipo: TipoIntegracion) {
    return this.integracionesService.testConexion(tipo);
  }

  @Get(':tipo/logs')
  @ApiOperation({ summary: 'Logs de integracion por tipo' })
  getLogs(
    @Param('tipo') tipo: TipoIntegracion,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.integracionesService.getLogs(tipo, page, limit);
  }
}
