import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { OrdenComprasService } from './orden-compras.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { RecibirOrdenCompraDto } from './dto/recibir-orden-compra.dto';
import { OrdenCompra } from './entities/orden-compra.entity';
import { OrdenesCompraQueryDto } from './dto/ordenes-compra-query.dto';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('ordenes-compra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes-compra')
export class OrdenComprasController {
  constructor(private readonly ordenComprasService: OrdenComprasService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async create(@Body() dto: CreateOrdenCompraDto, @Request() req: any): Promise<OrdenCompra> {
    return this.ordenComprasService.create(dto, req.user.id);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async findAll(@Query() query: OrdenesCompraQueryDto) {
    return this.ordenComprasService.findAll(query);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async findOne(@Param('id') id: string): Promise<OrdenCompra> {
    return this.ordenComprasService.findOne(id);
  }

  @Put(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async update(@Param('id') id: string, @Body() dto: UpdateOrdenCompraDto): Promise<OrdenCompra> {
    return this.ordenComprasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  async remove(@Param('id') id: string): Promise<OrdenCompra> {
    return this.ordenComprasService.remove(id);
  }

  @Post(':id/recibir')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async recibir(
    @Param('id') id: string,
    @Body() dto: RecibirOrdenCompraDto,
    @Request() req: any,
  ): Promise<OrdenCompra> {
    return this.ordenComprasService.recibir(id, dto, req.user.id);
  }

  @Get(':id/pdf')
  @Roles(Rol.ADMIN, Rol.SUPERVISOR, Rol.BODEGUERO)
  async generarPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.ordenComprasService.generarPdfOrdenCompra(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=orden-compra-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
