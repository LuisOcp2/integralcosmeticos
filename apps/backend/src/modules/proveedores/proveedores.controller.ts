import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  async create(@Body() createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    return this.proveedoresService.create(createProveedorDto);
  }

  @Get()
  async findAll(): Promise<Proveedor[]> {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Proveedor> {
    return this.proveedoresService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProveedorDto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    return this.proveedoresService.update(id, updateProveedorDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.proveedoresService.remove(id);
  }
}
