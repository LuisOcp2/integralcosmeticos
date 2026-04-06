import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';
import { ProveedoresQueryDto } from './dto/proveedores-query.dto';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  async create(@Body() createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    return this.proveedoresService.create(createProveedorDto);
  }

  @Get()
  async findAll(@Query() query: ProveedoresQueryDto) {
    return this.proveedoresService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Proveedor> {
    return this.proveedoresService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProveedorDto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    return this.proveedoresService.update(id, updateProveedorDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Proveedor> {
    return this.proveedoresService.remove(id);
  }
}
