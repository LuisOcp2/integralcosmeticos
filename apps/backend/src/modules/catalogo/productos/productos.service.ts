import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Marca } from '../marcas/entities/marca.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { ProductosQueryDto } from './dto/productos-query.dto';

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

  private limpiarTexto(valor?: string | null): string | undefined {
    const limpio = valor?.trim();
    return limpio ? limpio : undefined;
  }

  private normalizarBusqueda(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async validarCodigoInternoDisponible(
    codigoInterno?: string,
    excluirId?: string,
  ): Promise<void> {
    const codigo = this.limpiarTexto(codigoInterno);
    if (!codigo) {
      return;
    }

    const existente = await this.productosRepository.findOne({ where: { codigoInterno: codigo } });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException('Ya existe un producto con ese codigo interno');
    }
  }

  private async generarCodigoInterno(baseNombre: string): Promise<string> {
    const slug =
      baseNombre
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 20) || 'PROD';

    let intento = 1;
    while (intento <= 50) {
      const sufijo = `${Date.now().toString().slice(-6)}${String(intento).padStart(2, '0')}`;
      const codigo = `${slug}-${sufijo}`.slice(0, 50);
      const existente = await this.productosRepository.findOne({
        where: { codigoInterno: codigo },
      });
      if (!existente) {
        return codigo;
      }
      intento += 1;
    }

    throw new ConflictException('No se pudo generar un codigo interno unico para el producto');
  }

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
    const nombre = createProductoDto.nombre.trim();
    const descripcion = this.limpiarTexto(createProductoDto.descripcion);
    const imagenUrl = this.limpiarTexto(createProductoDto.imagenUrl);
    const codigoInternoInput = this.limpiarTexto(createProductoDto.codigoInterno);

    await this.validarRelaciones(createProductoDto.categoriaId, createProductoDto.marcaId);

    if (Number(createProductoDto.precioCosto) > Number(createProductoDto.precioBase)) {
      throw new BadRequestException('El precio de costo no puede ser mayor al precio base');
    }

    const existente = await this.productosRepository.findOne({
      where: {
        nombre,
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

    const codigoInterno = codigoInternoInput || (await this.generarCodigoInterno(nombre));
    await this.validarCodigoInternoDisponible(codigoInterno);

    const producto = this.productosRepository.create({
      ...createProductoDto,
      nombre,
      descripcion,
      imagenUrl,
      codigoInterno,
    });
    return this.productosRepository.save(producto);
  }

  async findAll(queryDto: ProductosQueryDto = {}): Promise<Producto[]> {
    const { categoriaId, marcaId, q } = queryDto;
    const productoNombreNormalizado = "translate(lower(producto.nombre), 'áéíóúüñ', 'aeiouun')";
    const categoriaNombreNormalizado = "translate(lower(categoria.nombre), 'áéíóúüñ', 'aeiouun')";
    const marcaNombreNormalizado = "translate(lower(marca.nombre), 'áéíóúüñ', 'aeiouun')";

    const query = this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.variantes', 'variantes', 'variantes.activa = true')
      .where('producto.activo = :activo', { activo: true });

    if (categoriaId) {
      query.andWhere('producto.categoriaId = :categoriaId', { categoriaId });
    }

    if (marcaId) {
      query.andWhere('producto.marcaId = :marcaId', { marcaId });
    }

    if (q?.trim()) {
      const qLimpio = q.trim().replace(/\s+/g, ' ');
      const qNormalizado = this.normalizarBusqueda(qLimpio);
      const tokens = qNormalizado
        .split(' ')
        .filter((token) => token.length > 0)
        .slice(0, 5);

      if (!tokens.length) {
        return [];
      }

      query.andWhere(
        new Brackets((qb) => {
          tokens.forEach((token, index) => {
            qb.andWhere(
              new Brackets((tokenQb) => {
                tokenQb
                  .where(`${productoNombreNormalizado} LIKE :token${index}`, {
                    [`token${index}`]: `%${token}%`,
                  })
                  .orWhere(`${categoriaNombreNormalizado} LIKE :tokenCategoria${index}`, {
                    [`tokenCategoria${index}`]: `%${token}%`,
                  })
                  .orWhere(`${marcaNombreNormalizado} LIKE :tokenMarca${index}`, {
                    [`tokenMarca${index}`]: `%${token}%`,
                  })
                  .orWhere(`lower(producto.codigoInterno) LIKE :tokenCodigoInterno${index}`, {
                    [`tokenCodigoInterno${index}`]: `%${token}%`,
                  })
                  .orWhere(`lower(variantes.sku) LIKE :tokenSku${index}`, {
                    [`tokenSku${index}`]: `%${token}%`,
                  })
                  .orWhere(`variantes.codigoBarras LIKE :tokenCodigoBarras${index}`, {
                    [`tokenCodigoBarras${index}`]: `%${token}%`,
                  });
              }),
            );
          });
        }),
      );
    }

    query.orderBy('producto.nombre', 'ASC');

    if (queryDto.limit) {
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit;
      query.take(limit).skip((page - 1) * limit);
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.variantes', 'variantes', 'variantes.activa = true')
      .where('producto.id = :id', { id })
      .andWhere('producto.activo = true')
      .orderBy('variantes.nombre', 'ASC')
      .getOne();
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  async findByBarcode(codigoBarras: string): Promise<Producto> {
    const producto = await this.productosRepository
      .createQueryBuilder('producto')
      .innerJoin('producto.variantes', 'variante', 'variante.activa = true')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('producto.marca', 'marca')
      .where('variante.codigoBarras = :codigoBarras', { codigoBarras: codigoBarras.trim() })
      .andWhere('producto.activo = true')
      .select('producto.id', 'id')
      .getRawOne<{ id: string }>();

    if (!producto?.id) {
      throw new NotFoundException('Variante no encontrada para el codigo de barras enviado');
    }

    return this.findOne(producto.id);
  }

  async update(id: string, updateProductoDto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);

    const nombre =
      updateProductoDto.nombre !== undefined ? updateProductoDto.nombre.trim() : producto.nombre;
    const descripcion =
      updateProductoDto.descripcion !== undefined
        ? this.limpiarTexto(updateProductoDto.descripcion)
        : producto.descripcion;
    const imagenUrl =
      updateProductoDto.imagenUrl !== undefined
        ? this.limpiarTexto(updateProductoDto.imagenUrl)
        : producto.imagenUrl;
    const codigoInterno =
      updateProductoDto.codigoInterno !== undefined
        ? (this.limpiarTexto(updateProductoDto.codigoInterno) ?? producto.codigoInterno)
        : producto.codigoInterno;
    const precioBase = updateProductoDto.precioBase ?? Number(producto.precioBase);
    const precioCosto = updateProductoDto.precioCosto ?? Number(producto.precioCosto);
    const iva = updateProductoDto.iva ?? Number(producto.iva);

    const categoriaId = updateProductoDto.categoriaId ?? producto.categoriaId;
    const marcaId = updateProductoDto.marcaId ?? producto.marcaId;
    if (updateProductoDto.categoriaId || updateProductoDto.marcaId) {
      await this.validarRelaciones(categoriaId, marcaId);
    }

    if (Number(precioCosto) > Number(precioBase)) {
      throw new BadRequestException('El precio de costo no puede ser mayor al precio base');
    }

    if (codigoInterno !== producto.codigoInterno) {
      await this.validarCodigoInternoDisponible(codigoInterno, producto.id);
    }

    if (
      (nombre !== producto.nombre ||
        categoriaId !== producto.categoriaId ||
        marcaId !== producto.marcaId) &&
      nombre
    ) {
      const existente = await this.productosRepository.findOne({
        where: {
          nombre,
          categoriaId,
          marcaId,
          activo: true,
        },
      });

      if (existente && existente.id !== producto.id) {
        throw new ConflictException(
          'Ya existe un producto activo con ese nombre en la categoria y marca',
        );
      }
    }

    await this.productosRepository.update(id, {
      nombre,
      descripcion,
      imagenUrl,
      codigoInterno,
      categoriaId,
      marcaId,
      precioBase,
      precioCosto,
      iva,
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const producto = await this.findOne(id);
    producto.activo = false;
    await this.productosRepository.save(producto);
  }
}
