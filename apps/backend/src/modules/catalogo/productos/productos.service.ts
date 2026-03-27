import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Marca } from '../marcas/entities/marca.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Marca)
    private readonly marcasRepository: Repository<Marca>,
  ) {}

  private async validarRelaciones(categoriaId: string, marcaId: string): Promise<void> {
    const [categoria, marca] = await Promise.all([
      this.categoriasRepository.findOne({ where: { id: categoriaId, activo: true } }),
      this.marcasRepository.findOne({ where: { id: marcaId, activo: true } }),
    ]);

    if (!categoria) {
      throw new NotFoundException('Categoria no encontrada o inactiva');
    }

    if (!marca) {
      throw new NotFoundException('Marca no encontrada o inactiva');
    }
  }

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    await this.validarRelaciones(createProductoDto.categoriaId, createProductoDto.marcaId);

    const existente = await this.productosRepository.findOne({
      where: {
        nombre: createProductoDto.nombre,
        categoriaId: createProductoDto.categoriaId,
        marcaId: createProductoDto.marcaId,
        activo: true,
      },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe un producto activo con ese nombre en la categoria y marca',
      );
    }

    const producto = this.productosRepository.create(createProductoDto);
    return this.productosRepository.save(producto);
  }

  async findAll(categoriaId?: string, marcaId?: string): Promise<Producto[]> {
    const query = this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .where('producto.activo = :activo', { activo: true })
      .andWhere('categoria.activo = :categoriaActiva', { categoriaActiva: true })
      .andWhere('marca.activo = :marcaActiva', { marcaActiva: true });

    if (categoriaId) {
      query.andWhere('producto.categoriaId = :categoriaId', { categoriaId });
    }

    if (marcaId) {
      query.andWhere('producto.marcaId = :marcaId', { marcaId });
    }

    query.orderBy('producto.nombre', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id, activo: true },
      relations: ['categoria', 'marca'],
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  async update(id: string, updateProductoDto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);

    const categoriaId = updateProductoDto.categoriaId ?? producto.categoriaId;
    const marcaId = updateProductoDto.marcaId ?? producto.marcaId;
    if (updateProductoDto.categoriaId || updateProductoDto.marcaId) {
      await this.validarRelaciones(categoriaId, marcaId);
    }

    Object.assign(producto, updateProductoDto);
    return this.productosRepository.save(producto);
  }

  async remove(id: string): Promise<void> {
    const producto = await this.findOne(id);
    producto.activo = false;
    await this.productosRepository.save(producto);
  }
}
