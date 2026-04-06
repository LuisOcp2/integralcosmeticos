import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { Brackets, DataSource, QueryFailedError, Repository } from 'typeorm';
import { OrdenCompra, EstadoOrdenCompra } from './entities/orden-compra.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { RecibirOrdenCompraDto } from './dto/recibir-orden-compra.dto';
import { OrdenesCompraQueryDto } from './dto/ordenes-compra-query.dto';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { InventarioService } from '../inventario/inventario.service';
import { PdfGeneratorUtil } from './utils/pdf-generator.util';

@Injectable()
export class OrdenComprasService {
  constructor(
    @InjectRepository(OrdenCompra)
    private readonly ordenCompraRepository: Repository<OrdenCompra>,
    @InjectRepository(DetalleOrdenCompra)
    private readonly detalleOrdenRepository: Repository<DetalleOrdenCompra>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    private readonly inventarioService: InventarioService,
    private readonly pdfGeneratorUtil: PdfGeneratorUtil,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private isMissingOrdenesSchemaError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const dbError = error as QueryFailedError & { code?: string; message?: string };
    const message = dbError.message?.toLowerCase() ?? '';
    return (
      dbError.code === '42P01' ||
      message.includes('relation "ordenes_compra" does not exist') ||
      message.includes('relation "detalles_orden_compra" does not exist')
    );
  }

  private throwOrdenesSchemaNotReady(): never {
    throw new BadRequestException(
      'Modulo de ordenes de compra no disponible: faltan tablas ordenes_compra/detalles_orden_compra. Ejecute migraciones de base de datos.',
    );
  }

  private async generarNumeroOrdenCompra(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    const [ultimo] = await manager.query(
      `SELECT numero
       FROM ordenes_compra
       WHERE numero LIKE $1
       ORDER BY CAST(SUBSTRING(numero FROM '[0-9]+$') AS INTEGER) DESC
       LIMIT 1`,
      [`OC-${year}-%`],
    );

    const ultimoNumero =
      ultimo?.numero && typeof ultimo.numero === 'string'
        ? Number(ultimo.numero.split('-').at(-1)) || 0
        : 0;
    const seq = `${ultimoNumero + 1}`.padStart(6, '0');
    return `OC-${year}-${seq}`;
  }

  async create(dto: CreateOrdenCompraDto, creadoPorId: string): Promise<OrdenCompra> {
    if (!dto.detalles?.length) {
      throw new BadRequestException('La orden debe tener al menos un detalle');
    }

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId, activo: true },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${dto.proveedorId} no encontrado`);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const ordenRepo = manager.getRepository(OrdenCompra);
        const detalleRepo = manager.getRepository(DetalleOrdenCompra);
        const numero = await this.generarNumeroOrdenCompra(manager);

        const subtotal = dto.detalles.reduce(
          (acc, item) => acc + Number(item.precioUnitario) * Number(item.cantidadPedida),
          0,
        );

        const orden = ordenRepo.create({
          numero,
          proveedorId: dto.proveedorId,
          sedeId: dto.sedeId,
          estado: EstadoOrdenCompra.BORRADOR,
          subtotal,
          impuestos: 0,
          total: subtotal,
          fechaEsperada: dto.fechaEsperada ? new Date(dto.fechaEsperada) : null,
          fechaRecepcion: null,
          creadoPorId,
          recibidoPorId: null,
          notas: dto.notas?.trim() ?? null,
        });

        const ordenGuardada = await ordenRepo.save(orden);

        const detalles = detalleRepo.create(
          dto.detalles.map((item) => ({
            ordenId: ordenGuardada.id,
            varianteId: item.varianteId,
            cantidadPedida: item.cantidadPedida,
            cantidadRecibida: 0,
            precioUnitario: item.precioUnitario,
          })),
        );

        await detalleRepo.save(detalles);

        const ordenCompleta = await ordenRepo.findOne({
          where: { id: ordenGuardada.id },
          relations: ['proveedor', 'detallesOrden'],
        });

        if (!ordenCompleta) {
          throw new NotFoundException(
            `Orden de compra con ID ${ordenGuardada.id} no encontrada despues de crearla`,
          );
        }

        return ordenCompleta;
      });
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        this.throwOrdenesSchemaNotReady();
      }
      throw error;
    }
  }

  async findAll(query: OrdenesCompraQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.ordenCompraRepository
      .createQueryBuilder('orden')
      .leftJoinAndSelect('orden.proveedor', 'proveedor')
      .leftJoinAndSelect('orden.detallesOrden', 'detalles')
      .orderBy('orden."createdAt"', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.where(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(orden.numero) LIKE :term', { term })
            .orWhere('LOWER(proveedor.razon_social) LIKE :term', { term })
            .orWhere('LOWER(proveedor.nit) LIKE :term', { term });
        }),
      );
    }

    if (query.proveedorId) {
      qb.andWhere('orden."proveedorId" = :proveedorId', { proveedorId: query.proveedorId });
    }

    if (query.sedeId) {
      qb.andWhere('orden."sedeId" = :sedeId', { sedeId: query.sedeId });
    }

    if (query.estado) {
      qb.andWhere('orden.estado = :estado', { estado: query.estado });
    }

    let items: OrdenCompra[] = [];
    let total = 0;

    try {
      [items, total] = await Promise.all([
        qb.clone().offset(offset).limit(limit).getMany(),
        qb.clone().getCount(),
      ]);
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        return {
          page,
          limit,
          total: 0,
          totalPages: 1,
          items: [],
        };
      }
      throw error;
    }

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items,
    };
  }

  async findOne(id: string): Promise<OrdenCompra> {
    let ordenCompra: OrdenCompra | null;
    try {
      ordenCompra = await this.ordenCompraRepository.findOne({
        where: { id },
        relations: ['proveedor', 'detallesOrden'],
      });
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        this.throwOrdenesSchemaNotReady();
      }
      throw error;
    }

    if (!ordenCompra) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
    }
    return ordenCompra;
  }

  async update(id: string, dto: UpdateOrdenCompraDto): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (dto.proveedorId !== undefined && dto.proveedorId !== orden.proveedorId) {
      const proveedor = await this.proveedorRepository.findOne({
        where: { id: dto.proveedorId, activo: true },
      });
      if (!proveedor) {
        throw new NotFoundException(`Proveedor con ID ${dto.proveedorId} no encontrado`);
      }
      orden.proveedorId = dto.proveedorId;
    }

    if (dto.sedeId !== undefined) {
      orden.sedeId = dto.sedeId;
    }

    if (dto.fechaEsperada !== undefined) {
      orden.fechaEsperada = dto.fechaEsperada ? new Date(dto.fechaEsperada) : null;
    }

    if (dto.notas !== undefined) {
      orden.notas = dto.notas?.trim() ? dto.notas.trim() : null;
    }

    try {
      return await this.ordenCompraRepository.save(orden);
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        this.throwOrdenesSchemaNotReady();
      }
      throw error;
    }
  }

  async remove(id: string): Promise<OrdenCompra> {
    const orden = await this.findOne(id);
    orden.estado = EstadoOrdenCompra.CANCELADA;
    try {
      return await this.ordenCompraRepository.save(orden);
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        this.throwOrdenesSchemaNotReady();
      }
      throw error;
    }
  }

  async recibir(
    id: string,
    dto: RecibirOrdenCompraDto,
    recibidoPorId: string,
  ): Promise<OrdenCompra> {
    if (!dto.detalles?.length) {
      throw new BadRequestException('Debe enviar al menos un detalle para recepcion');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const orden = await manager.getRepository(OrdenCompra).findOne({
          where: { id },
          relations: ['detallesOrden'],
        });

        if (!orden) {
          throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
        }

        if (
          [EstadoOrdenCompra.CANCELADA, EstadoOrdenCompra.RECIBIDA_TOTAL].includes(orden.estado)
        ) {
          throw new BadRequestException('La orden no admite recepcion en su estado actual');
        }

        const detallesPorId = new Map(orden.detallesOrden.map((d) => [d.id, d]));

        for (const item of dto.detalles) {
          const detalle = detallesPorId.get(item.detalleId);
          if (!detalle) {
            throw new NotFoundException(`Detalle ${item.detalleId} no pertenece a la orden`);
          }

          const faltante = detalle.cantidadPedida - detalle.cantidadRecibida;
          if (item.cantidadRecibida > faltante) {
            throw new BadRequestException(
              `La cantidad recibida supera lo pendiente para el detalle ${item.detalleId}`,
            );
          }

          if (item.cantidadRecibida === 0) {
            continue;
          }

          detalle.cantidadRecibida += item.cantidadRecibida;
          await manager.getRepository(DetalleOrdenCompra).save(detalle);

          await this.inventarioService.registrarMovimientoConManager(
            {
              tipo: TipoMovimiento.ENTRADA,
              varianteId: detalle.varianteId,
              sedeDestinoId: orden.sedeId,
              cantidad: item.cantidadRecibida,
              motivo: `Recepcion orden ${orden.numero}`,
              referencia: orden.numero,
            },
            recibidoPorId,
            manager,
          );
        }

        const detallesActualizados = await manager.getRepository(DetalleOrdenCompra).find({
          where: { ordenId: orden.id },
        });

        const totalPedida = detallesActualizados.reduce((acc, d) => acc + d.cantidadPedida, 0);
        const totalRecibida = detallesActualizados.reduce((acc, d) => acc + d.cantidadRecibida, 0);

        orden.estado =
          totalRecibida >= totalPedida
            ? EstadoOrdenCompra.RECIBIDA_TOTAL
            : EstadoOrdenCompra.RECIBIDA_PARCIAL;
        orden.fechaRecepcion = new Date();
        orden.recibidoPorId = recibidoPorId;

        return manager.getRepository(OrdenCompra).save(orden);
      });
    } catch (error) {
      if (this.isMissingOrdenesSchemaError(error)) {
        this.throwOrdenesSchemaNotReady();
      }
      throw error;
    }
  }

  async generarPdfOrdenCompra(id: string): Promise<Buffer> {
    const ordenCompra = await this.ordenCompraRepository.findOne({
      where: { id },
      relations: [
        'proveedor',
        'sede',
        'creadoPor',
        'detallesOrden',
        'detallesOrden.variante',
        'detallesOrden.variante.producto',
      ],
    });

    if (!ordenCompra) {
      throw new NotFoundException(`Orden de compra con ID ${id} no encontrada`);
    }

    return this.pdfGeneratorUtil.generarPdfOrdenCompra(ordenCompra);
  }
}
