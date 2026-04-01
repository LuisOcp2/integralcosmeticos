import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OrdenComprasService } from './orden-compras.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { OrdenCompra } from './entities/orden-compra.entity';
import { Response } from 'express';

@Controller('orden-compras')
export class OrdenComprasController {
  constructor(private readonly ordenComprasService: OrdenComprasService) {}

  @Post()
  async create(@Body() createOrdenCompraDto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    return this.ordenComprasService.create(createOrdenCompraDto);
  }

  @Get()
  async findAll(): Promise<OrdenCompra[]> {
    return this.ordenComprasService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<OrdenCompra> {
    return this.ordenComprasService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<OrdenCompra>,
  ): Promise<OrdenCompra> {
    return this.ordenComprasService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ordenComprasService.remove(id);
  }

  @Get(':id/pdf')
  async generarPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const pdfBuffer = await this.ordenComprasService.generarPdfOrdenCompra(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orden-compra-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
