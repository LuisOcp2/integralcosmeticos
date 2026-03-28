import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CategoriasService } from '../catalogo/categorias/categorias.service';
import { MarcasService } from '../catalogo/marcas/marcas.service';
import { ConfiguracionesService } from './configuraciones.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';
import { CreateParametroConfiguracionDto } from './dto/create-parametro-configuracion.dto';
import { UpdateParametroConfiguracionDto } from './dto/update-parametro-configuracion.dto';

@ApiTags('configuraciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('configuraciones')
export class ConfiguracionesController {
  constructor(
    private readonly configuracionesService: ConfiguracionesService,
    private readonly categoriasService: CategoriasService,
    private readonly marcasService: MarcasService,
  ) {}

  @Get('maestro')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({
    summary:
      'Obtener catalogos maestros de configuracion (categorias, marcas, tipos de documento, parametros)',
  })
  async getMaestro() {
    const categorias = await this.categoriasService.findAll(false);
    const marcas = await this.marcasService.findAll(false);
    const tiposDocumento = await this.configuracionesService.findAllTiposDocumento(true);
    const parametros = await this.configuracionesService.findAllParametros(true);

    return {
      categorias,
      marcas,
      tiposDocumento,
      parametros,
    };
  }

  @Get('health')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Verificar salud de tablas y conteos de configuracion' })
  health() {
    return this.configuracionesService.getHealth();
  }

  @Post('tipos-documento')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear tipo de documento en configuracion' })
  createTipoDocumento(@Body() dto: CreateTipoDocumentoDto) {
    return this.configuracionesService.createTipoDocumento(dto);
  }

  @Get('tipos-documento')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar tipos de documento' })
  findAllTiposDocumento(@Query('incluirInactivos') incluirInactivos?: string) {
    const soloActivos = incluirInactivos !== 'true';
    return this.configuracionesService.findAllTiposDocumento(soloActivos);
  }

  @Get('tipos-documento/:id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener tipo de documento por ID' })
  findTipoDocumentoById(@Param('id') id: string) {
    return this.configuracionesService.findTipoDocumentoById(id);
  }

  @Patch('tipos-documento/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar tipo de documento' })
  updateTipoDocumento(@Param('id') id: string, @Body() dto: UpdateTipoDocumentoDto) {
    return this.configuracionesService.updateTipoDocumento(id, dto);
  }

  @Delete('tipos-documento/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Desactivar tipo de documento' })
  removeTipoDocumento(@Param('id') id: string) {
    return this.configuracionesService.removeTipoDocumento(id);
  }

  @Post('parametros')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear parametro de configuracion' })
  createParametro(@Body() dto: CreateParametroConfiguracionDto) {
    return this.configuracionesService.createParametro(dto);
  }

  @Get('parametros')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Listar parametros de configuracion' })
  findAllParametros(@Query('incluirInactivos') incluirInactivos?: string) {
    const soloActivos = incluirInactivos !== 'true';
    return this.configuracionesService.findAllParametros(soloActivos);
  }

  @Get('parametros/clave/:clave')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar parametro por clave' })
  findParametroByClave(@Param('clave') clave: string) {
    return this.configuracionesService.findParametroByClave(clave);
  }

  @Patch('parametros/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar parametro de configuracion' })
  updateParametro(@Param('id') id: string, @Body() dto: UpdateParametroConfiguracionDto) {
    return this.configuracionesService.updateParametro(id, dto);
  }

  @Delete('parametros/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Desactivar parametro de configuracion' })
  removeParametro(@Param('id') id: string) {
    return this.configuracionesService.removeParametro(id);
  }

  @Get('parametros/bootstrap')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Endpoint compatibilidad para bootstrap de parametros base' })
  bootstrapParametrosGet() {
    return this.configuracionesService.bootstrapParametrosBase();
  }

  @Post('parametros/bootstrap')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear/rehabilitar parametros base recomendados del sistema' })
  bootstrapParametros() {
    return this.configuracionesService.bootstrapParametrosBase();
  }
}
