import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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

  private limpiarTexto(valor?: string | null): string | undefined {
    const limpio = valor?.trim();
    return limpio ? limpio : undefined;
  }

  private normalizarTokenSku(texto: string | undefined, size: number, fallback: string): string {
    const token = (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!token) {
      return fallback.padEnd(size, 'X').slice(0, size);
    }

    return token.slice(0, size).padEnd(size, 'X');
  }

  private construirSkuBase(producto: Producto, nombreVariante: string): string {
    const tokenMarca = this.normalizarTokenSku(producto.marca?.nombre, 3, 'MRC');
    const tokenCategoria = this.normalizarTokenSku(producto.categoria?.nombre, 3, 'CAT');
    const tokenProducto = this.normalizarTokenSku(
      producto.codigoInterno || producto.nombre,
      2,
      'PR',
    );
    const tokenVariante = this.normalizarTokenSku(nombreVariante, 2, 'VR');

    return `${tokenMarca}${tokenCategoria}${tokenProducto}${tokenVariante}`;
  }

  private randomDigits(size: number): string {
    let out = '';
    while (out.length < size) {
      out += Math.floor(Math.random() * 10).toString();
    }
    return out.slice(0, size);
  }

  private calcularDigitoControlEan13(base12: string): string {
    const suma = base12
      .split('')
      .map((d) => Number(d))
      .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3), 0);
    const check = (10 - (suma % 10)) % 10;
    return String(check);
  }

  private async generarEan13Unico(): Promise<string> {
    let intento = 0;
    while (intento < 120) {
      const base12 = `770${this.randomDigits(9)}`;
      const ean = `${base12}${this.calcularDigitoControlEan13(base12)}`;
      const existente = await this.variantesRepository.findOne({ where: { codigoBarras: ean } });
      if (!existente) {
        return ean;
      }
      intento += 1;
    }

    throw new ConflictException('No se pudo generar un EAN-13 unico, intente nuevamente');
  }

  private async generarSkuUnico(producto: Producto, nombreVariante: string): Promise<string> {
    const base = this.construirSkuBase(producto, nombreVariante);

    let intento = 1;
    while (intento <= 999) {
      const sufijo = String(intento).padStart(3, '0');
      const sku = `${base}${sufijo}`.slice(0, 100);
      const existente = await this.variantesRepository.findOne({ where: { sku } });
      if (!existente) {
        return sku;
      }
      intento += 1;
    }

    throw new ConflictException('No se pudo generar un SKU unico, intente nuevamente');
  }

  private validarCoherenciaPrecios(precioVenta?: number, precioCosto?: number): void {
    if (precioVenta === undefined || precioCosto === undefined) {
      return;
    }

    if (Number(precioCosto) > Number(precioVenta)) {
      throw new BadRequestException('El precio de costo no puede ser mayor al precio de venta');
    }
  }

  private validarFormatoCodigoBarras(codigoBarras: string): void {
    const esNumerico = /^\d{8,14}$/.test(codigoBarras);
    if (!esNumerico) {
      throw new BadRequestException(
        'El codigo de barras debe contener solo digitos y tener entre 8 y 14 caracteres',
      );
    }
  }

  private normalizarBusqueda(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async obtenerProductoActivo(productoId: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id: productoId, activo: true },
      relations: ['categoria', 'marca'],
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }

    return producto;
  }

  private async validarProductoActivo(productoId: string): Promise<void> {
    await this.obtenerProductoActivo(productoId);
  }

  async create(createVarianteDto: CreateVarianteDto): Promise<Variante> {
    const nombre = createVarianteDto.nombre.trim();
    const skuInput = this.limpiarTexto(createVarianteDto.sku);
    const codigoBarrasInput = this.limpiarTexto(createVarianteDto.codigoBarras);
    const imagenUrl = this.limpiarTexto(createVarianteDto.imagenUrl);

    this.validarCoherenciaPrecios(createVarianteDto.precioVenta, createVarianteDto.precioCosto);

    const producto = await this.obtenerProductoActivo(createVarianteDto.productoId);
    const sku = skuInput ?? (await this.generarSkuUnico(producto, nombre));
    const codigoBarras = codigoBarrasInput ?? (await this.generarEan13Unico());

    this.validarFormatoCodigoBarras(codigoBarras);

    const [codigoExistente, skuExistente] = await Promise.all([
      this.variantesRepository.findOne({ where: { codigoBarras } }),
      this.variantesRepository.findOne({ where: { sku } }),
    ]);

    if (codigoExistente) {
      throw new ConflictException('Ya existe una variante con ese codigo de barras');
    }

    if (skuExistente) {
      throw new ConflictException('Ya existe una variante con ese SKU');
    }

    const variante = this.variantesRepository.create({
      ...createVarianteDto,
      nombre,
      sku,
      codigoBarras,
      imagenUrl,
    });
    return this.variantesRepository.save(variante);
  }

  async findAll(productoId?: string, q?: string): Promise<Variante[]> {
    const varianteNombreNormalizado = "translate(lower(variante.nombre), 'áéíóúüñ', 'aeiouun')";
    const productoNombreNormalizado = "translate(lower(producto.nombre), 'áéíóúüñ', 'aeiouun')";

    const query = this.variantesRepository
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .where('variante.activa = true')
      .andWhere('producto.activo = true')
      .orderBy('variante.nombre', 'ASC');

    if (productoId) {
      query.andWhere('variante.productoId = :productoId', { productoId });
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
                  .where(`${varianteNombreNormalizado} LIKE :token${index}`, {
                    [`token${index}`]: `%${token}%`,
                  })
                  .orWhere(`${productoNombreNormalizado} LIKE :token${index}`, {
                    [`token${index}`]: `%${token}%`,
                  })
                  .orWhere(`lower(variante.sku) LIKE :tokenSku${index}`, {
                    [`tokenSku${index}`]: `%${token}%`,
                  })
                  .orWhere(`variante.codigoBarras LIKE :tokenCodigo${index}`, {
                    [`tokenCodigo${index}`]: `%${token}%`,
                  });
              }),
            );
          });
        }),
      );

      query
        .addSelect(
          `CASE
            WHEN variante.codigoBarras = :qExactRaw THEN 0
            WHEN lower(variante.sku) = :qExactNorm THEN 1
            WHEN ${varianteNombreNormalizado} LIKE :qPrefixNorm THEN 2
            WHEN ${productoNombreNormalizado} LIKE :qPrefixNorm THEN 3
            WHEN variante.codigoBarras LIKE :qPrefixRaw THEN 4
            WHEN lower(variante.sku) LIKE :qPrefixNorm THEN 5
            ELSE 6
          END`,
          'score_busqueda',
        )
        .setParameters({
          qExactRaw: qLimpio,
          qExactNorm: qNormalizado,
          qPrefixRaw: `${qLimpio}%`,
          qPrefixNorm: `${qNormalizado}%`,
        })
        .orderBy('score_busqueda', 'ASC')
        .addOrderBy('variante.nombre', 'ASC')
        .limit(60);
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Variante> {
    const variante = await this.variantesRepository
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('producto.marca', 'marca')
      .where('variante.id = :id', { id })
      .andWhere('variante.activa = true')
      .andWhere('producto.activo = true')
      .getOne();
    if (!variante) {
      throw new NotFoundException('Variante no encontrada');
    }
    return variante;
  }

  async findByCodigoBarras(codigoBarras: string): Promise<Variante> {
    const variante = await this.variantesRepository
      .createQueryBuilder('variante')
      .leftJoinAndSelect('variante.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .leftJoin('producto.marca', 'marca')
      .where('variante.codigoBarras = :codigoBarras', { codigoBarras: codigoBarras.trim() })
      .andWhere('variante.activa = true')
      .andWhere('producto.activo = true')
      .getOne();
    if (!variante) {
      throw new NotFoundException('Variante no encontrada para el codigo de barras enviado');
    }
    return variante;
  }

  async update(id: string, updateVarianteDto: UpdateVarianteDto): Promise<Variante> {
    const variante = await this.findOne(id);

    const sku = updateVarianteDto.sku !== undefined ? updateVarianteDto.sku.trim() : variante.sku;
    const codigoBarras =
      updateVarianteDto.codigoBarras !== undefined
        ? updateVarianteDto.codigoBarras.trim()
        : variante.codigoBarras;
    const nombre =
      updateVarianteDto.nombre !== undefined ? updateVarianteDto.nombre.trim() : variante.nombre;
    const imagenUrl =
      updateVarianteDto.imagenUrl !== undefined
        ? this.limpiarTexto(updateVarianteDto.imagenUrl)
        : variante.imagenUrl;
    const precioVenta =
      updateVarianteDto.precioVenta !== undefined
        ? updateVarianteDto.precioVenta
        : (variante.precioVenta ?? undefined);
    const precioCosto =
      updateVarianteDto.precioCosto !== undefined
        ? updateVarianteDto.precioCosto
        : (variante.precioCosto ?? undefined);

    this.validarCoherenciaPrecios(precioVenta, precioCosto);
    this.validarFormatoCodigoBarras(codigoBarras);

    if (updateVarianteDto.productoId) {
      await this.validarProductoActivo(updateVarianteDto.productoId);
    }

    if (codigoBarras && codigoBarras !== variante.codigoBarras) {
      const existeCodigo = await this.variantesRepository.findOne({
        where: { codigoBarras },
      });
      if (existeCodigo && existeCodigo.id !== variante.id) {
        throw new ConflictException('Ya existe una variante con ese codigo de barras');
      }
    }

    if (sku && sku !== variante.sku) {
      const existeSku = await this.variantesRepository.findOne({
        where: { sku },
      });
      if (existeSku && existeSku.id !== variante.id) {
        throw new ConflictException('Ya existe una variante con ese SKU');
      }
    }

    Object.assign(variante, {
      ...updateVarianteDto,
      sku,
      codigoBarras,
      nombre,
      imagenUrl,
    });
    return this.variantesRepository.save(variante);
  }

  async remove(id: string): Promise<void> {
    const variante = await this.findOne(id);
    variante.activo = false;
    await this.variantesRepository.save(variante);
  }
}
