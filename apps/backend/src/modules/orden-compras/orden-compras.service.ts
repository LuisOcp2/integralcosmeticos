import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { PdfGeneratorUtil } from './utils/pdf-generator.util';

@Injectable()
export class OrdenComprasService {
  constructor(
    @InjectRepository(OrdenCompra)
    private ordenCompraRepository: Repository<OrdenCompra>,
    @InjectRepository(Proveedor)
    private proveedorRepository: Repository<Proveedor>,
    private pdfGeneratorUtil: PdfGeneratorUtil,
  ) {}

  async create(createOrdenCompraDto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: createOrdenCompraDto.proveedorId },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `Proveedor con ID ${createOrdenCompraDto.proveedorId} no encontrado`,
      );
    }

    const ordenCompra = this.ordenCompraRepository.create({
      ...createOrdenCompraDto,
      proveedor,
    });
    return this.ordenCompraRepository.save(ordenCompra);
  }

  async findAll(): Promise<OrdenCompra[]> {
    return this.ordenCompraRepository.find({ relations: ['proveedor'] });
  }

  async findOne(id: number): Promise<OrdenCompra> {
    const ordenCompra = await this.ordenCompraRepository.findOne({
      where: { id },
      relations: ['proveedor'],
    });
    if (!ordenCompra) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
    }
    return ordenCompra;
  }

  async update(id: number, updateData: Partial<OrdenCompra>): Promise<OrdenCompra> {
    await this.ordenCompraRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const ordenCompra = await this.findOne(id);
    await this.ordenCompraRepository.remove(ordenCompra);
  }

  async generarPdfOrdenCompra(id: number): Promise<Buffer> {
    const ordenCompra = await this.findOne(id);
    return this.pdfGeneratorUtil.generarPdfOrdenCompra(ordenCompra);
  }
}
