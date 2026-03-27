import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSedeDto } from './dto/create-sede.dto';
import { SedesService } from './sedes.service';

@ApiTags('sedes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear sede' })
  create(@Body() createSedeDto: CreateSedeDto) {
    return this.sedesService.create(createSedeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sedes activas' })
  findAll() {
    return this.sedesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sede por ID' })
  findOne(@Param('id') id: string) {
    return this.sedesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar sede' })
  remove(@Param('id') id: string) {
    return this.sedesService.remove(id);
  }
}
