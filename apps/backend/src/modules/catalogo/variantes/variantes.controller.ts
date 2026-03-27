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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { UpdateVarianteDto } from './dto/update-variante.dto';
import { VariantesService } from './variantes.service';

@ApiTags('variantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(['variantes', 'catalogo/variantes'])
export class VariantesController {
  constructor(private readonly variantesService: VariantesService) {}

  @Post()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear variante' })
  create(@Body() createVarianteDto: CreateVarianteDto) {
    return this.variantesService.create(createVarianteDto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar variantes activas' })
  @ApiQuery({ name: 'productoId', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  findAll(@Query('productoId') productoId?: string, @Query('q') q?: string) {
    return this.variantesService.findAll(productoId, q);
  }

  @Get('barcode/:codigoBarras')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar variante por codigo de barras' })
  findByCodigoBarras(@Param('codigoBarras') codigoBarras: string) {
    return this.variantesService.findByCodigoBarras(codigoBarras);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener variante por ID' })
  findOne(@Param('id') id: string) {
    return this.variantesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar variante' })
  update(@Param('id') id: string, @Body() updateVarianteDto: UpdateVarianteDto) {
    return this.variantesService.update(id, updateVarianteDto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Desactivar variante' })
  remove(@Param('id') id: string) {
    return this.variantesService.remove(id);
  }
}
