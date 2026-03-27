import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { UpdateVarianteDto } from './dto/update-variante.dto';
import { Variante } from './entities/variante.entity';

@Injectable()
export class VariantesService {
  constructor(
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
  ) {}

  private async validarProductoActivo(productoId: string): Promise<void> {
    const producto = await this.productosRepository.findOne({
      where: { id: productoId, activo: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }
  }

  async create(createVarianteDto: CreateVarianteDto): Promise<Variante> {
    await this.validarProductoActivo(createVarianteDto.productoId);

    const [codigoExistente, skuExistente] = await Promise.all([
      this.variantesRepository.findOne({ where: { codigoBarras: createVarianteDto.codigoBarras } }),
      this.variantesRepository.findOne({ where: { sku: createVarianteDto.sku } }),
    ]);

    if (codigoExistente?.activo) {
      throw new ConflictException('Ya existe una variante activa con ese codigo de barras');
    }

    if (skuExistente?.activo) {
      throw new ConflictException('Ya existe una variante activa con ese SKU');
    }

    const variante = this.variantesRepository.create(createVarianteDto);
    return this.variantesRepository.save(variante);
  }

  async findAll(productoId?: string): Promise<Variante[]> {
    const where = productoId ? { activo: true, productoId } : { activo: true };
    return this.variantesRepository.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: string): Promise<Variante> {
    const variante = await this.variantesRepository.findOne({
      where: { id, activo: true },
      relations: ['producto'],
    });
    if (!variante) {
      throw new NotFoundException('Variante no encontrada');
    }
    return variante;
  }

  async findByCodigoBarras(codigoBarras: string): Promise<Variante> {
    const variante = await this.variantesRepository.findOne({
      where: { codigoBarras, activo: true },
      relations: ['producto'],
    });
    if (!variante) {
      throw new NotFoundException('Variante no encontrada para el codigo de barras enviado');
    }
    return variante;
  }

  async update(id: string, updateVarianteDto: UpdateVarianteDto): Promise<Variante> {
    const variante = await this.findOne(id);

    if (updateVarianteDto.productoId) {
      await this.validarProductoActivo(updateVarianteDto.productoId);
    }

    if (
      updateVarianteDto.codigoBarras &&
      updateVarianteDto.codigoBarras !== variante.codigoBarras
    ) {
      const existeCodigo = await this.variantesRepository.findOne({
        where: { codigoBarras: updateVarianteDto.codigoBarras, activo: true },
      });
      if (existeCodigo) {
        throw new ConflictException('Ya existe una variante activa con ese codigo de barras');
      }
    }

    if (updateVarianteDto.sku && updateVarianteDto.sku !== variante.sku) {
      const existeSku = await this.variantesRepository.findOne({
        where: { sku: updateVarianteDto.sku, activo: true },
      });
      if (existeSku) {
        throw new ConflictException('Ya existe una variante activa con ese SKU');
      }
    }

    Object.assign(variante, updateVarianteDto);
    return this.variantesRepository.save(variante);
  }

  async remove(id: string): Promise<void> {
    const variante = await this.findOne(id);
    variante.activo = false;
    await this.variantesRepository.save(variante);
  }
}
