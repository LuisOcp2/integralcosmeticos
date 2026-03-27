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
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductosQueryDto } from './dto/productos-query.dto';
import { ProductosService } from './productos.service';
import { VariantesService } from '../variantes/variantes.service';

@ApiTags('productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly variantesService: VariantesService,
  ) {}

  @Post()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar productos activos' })
  @ApiQuery({ name: 'categoriaId', required: false, type: String })
  @ApiQuery({ name: 'marcaId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String })
  findAll(@Query() query: ProductosQueryDto) {
    return this.productosService.findAll(query);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener producto por ID' })
  async findOne(@Param('id') id: string) {
    const [producto, variantes] = await Promise.all([
      this.productosService.findOne(id),
      this.variantesService.findAll(id),
    ]);

    return {
      ...producto,
      variantes,
    };
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Desactivar producto' })
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }

  @Get('barcode/:codigo')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Buscar producto por codigo de barras de variante' })
  async findByBarcode(@Param('codigo') codigo: string) {
    const variante = await this.variantesService.findByCodigoBarras(codigo);
    const [producto, variantes] = await Promise.all([
      this.productosService.findOne(variante.productoId),
      this.variantesService.findAll(variante.productoId),
    ]);

    return {
      ...producto,
      variantes,
    };
  }
}
