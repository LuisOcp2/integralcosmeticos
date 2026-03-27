import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { MarcasService } from './marcas.service';

@ApiTags('marcas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marcas')
export class MarcasController {
  constructor(private readonly marcasService: MarcasService) {}

  @Post()
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear marca' })
  create(@Body() createMarcaDto: CreateMarcaDto) {
    return this.marcasService.create(createMarcaDto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Listar marcas activas' })
  findAll() {
    return this.marcasService.findAll();
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO, Rol.BODEGUERO)
  @ApiOperation({ summary: 'Obtener marca por ID' })
  findOne(@Param('id') id: string) {
    return this.marcasService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar marca' })
  update(@Param('id') id: string, @Body() updateMarcaDto: UpdateMarcaDto) {
    return this.marcasService.update(id, updateMarcaDto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Desactivar marca' })
  remove(@Param('id') id: string) {
    return this.marcasService.remove(id);
  }
}
