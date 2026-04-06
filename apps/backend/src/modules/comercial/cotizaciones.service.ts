import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from './dto/actualizar-cotizacion.dto';
import { FiltrosCotizacionDto } from './dto/filtros-cotizacion.dto';
import { Cotizacion, EstadoCotizacion } from './entities/cotizacion.entity';
import { DetalleCotizacion } from './entities/detalle-cotizacion.entity';
import { Pedido, EstadoPedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';

type TotalesCalculados = {
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
};

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionesRepository: Repository<Cotizacion>,
    @InjectRepository(DetalleCotizacion)
    private readonly detallesRepository: Repository<DetalleCotizacion>,
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private readonly detallePedidosRepository: Repository<DetallePedido>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async generarNumeroCotizacion(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS cotizaciones_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('cotizaciones_numero_seq')::text, 6, '0') AS seq",
    );
    return `COT-${year}-${seq}`;
  }

  private async generarNumeroPedido(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('pedidos_numero_seq')::text, 6, '0') AS seq",
    );
    return `PED-${year}-${seq}`;
  }

  private redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async resolverDescripcionVariante(
    varianteId: string,
    fallback?: string,
  ): Promise<string> {
    if (fallback?.trim()) {
      return fallback.trim();
    }

    const variante = await this.variantesRepository.findOne({
      where: { id: varianteId },
      relations: ['producto'],
    });

    if (!variante) {
      return varianteId;
    }

    return `${variante.producto?.nombre ?? 'Producto'} - ${variante.nombre}`.slice(0, 200);
  }

  private async resolverProductoIdPorVariante(varianteId: string): Promise<string | null> {
    const variante = await this.variantesRepository.findOne({
      where: { id: varianteId },
      select: ['id', 'productoId'],
    });
    return variante?.productoId ?? null;
  }

  private calcularTotales(
    detalles: Array<{ cantidad: number; precioUnitario: number; descuento?: number }>,
    descuentoGlobal = 0,
  ): TotalesCalculados {
    let subtotal = 0;
    let descuento = 0;

    for (const detalle of detalles) {
      const bruto = Number(detalle.cantidad) * Number(detalle.precioUnitario);
      const descuentoDetalle = Number(detalle.descuento ?? 0);
      subtotal += bruto;
      descuento += descuentoDetalle;
    }

    descuento += Number(descuentoGlobal || 0);
    const baseImpuesto = Math.max(subtotal - descuento, 0);
    const impuestos = baseImpuesto * 0.19;
    const total = baseImpuesto + impuestos;

    return {
      subtotal: this.redondear(subtotal),
      descuento: this.redondear(descuento),
      impuestos: this.redondear(impuestos),
      total: this.redondear(total),
    };
  }

  async create(dto: CrearCotizacionDto, userId: string, sedeId?: string): Promise<Cotizacion> {
    return this.dataSource.transaction(async (manager) => {
      const numero = await this.generarNumeroCotizacion(manager);
      const totales = this.calcularTotales(dto.detalles, dto.descuento ?? 0);

      const cotizacion = manager.getRepository(Cotizacion).create({
        numero,
        clienteId: dto.clienteId,
        estado: EstadoCotizacion.PENDIENTE,
        fechaVigencia: dto.fechaVigencia,
        subtotal: totales.subtotal,
        descuento: totales.descuento,
        impuestos: totales.impuestos,
        total: totales.total,
        notasCliente: dto.notasCliente?.trim() || null,
        terminosCondiciones: dto.terminosCondiciones?.trim() || null,
        creadoPorId: userId,
        sedeId: sedeId ?? '00000000-0000-0000-0000-000000000001',
      });

      const cotizacionGuardada = await manager.getRepository(Cotizacion).save(cotizacion);

      for (const detalle of dto.detalles) {
        const descripcion = await this.resolverDescripcionVariante(
          detalle.varianteId,
          detalle.descripcion,
        );
        const productoId = await this.resolverProductoIdPorVariante(detalle.varianteId);
        if (!productoId) {
          throw new NotFoundException(`Variante no encontrada: ${detalle.varianteId}`);
        }
        const subtotal = this.redondear(
          Number(detalle.cantidad) * Number(detalle.precioUnitario) -
            Number(detalle.descuento ?? 0),
        );

        await manager.getRepository(DetalleCotizacion).save(
          manager.getRepository(DetalleCotizacion).create({
            cotizacionId: cotizacionGuardada.id,
            varianteId: detalle.varianteId,
            productoId,
            descripcion,
            cantidad: detalle.cantidad,
            precioUnitario: this.redondear(Number(detalle.precioUnitario)),
            descuento: this.redondear(Number(detalle.descuento ?? 0)),
            subtotal,
          }),
        );
      }

      const creada = await manager.getRepository(Cotizacion).findOne({
        where: { id: cotizacionGuardada.id },
        relations: ['detalles', 'cliente'],
      });

      if (!creada) {
        throw new NotFoundException('No se pudo cargar la cotizacion creada');
      }

      return creada;
    });
  }

  async findAll(query: FiltrosCotizacionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.cotizacionesRepository
      .createQueryBuilder('cotizacion')
      .leftJoinAndSelect('cotizacion.cliente', 'cliente')
      .orderBy('cotizacion.createdAt', 'DESC');

    if (query.estado) {
      qb.andWhere('cotizacion.estado = :estado', { estado: query.estado });
    }

    if (query.clienteId) {
      qb.andWhere('cotizacion.clienteId = :clienteId', { clienteId: query.clienteId });
    }

    if (query.q?.trim()) {
      qb.andWhere('LOWER(cotizacion.numero) LIKE :q', { q: `%${query.q.trim().toLowerCase()}%` });
    }

    const [items, total] = await Promise.all([
      qb.clone().skip(offset).take(limit).getMany(),
      qb.clone().getCount(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items,
    };
  }

  async findOne(id: string): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionesRepository.findOne({
      where: { id },
      relations: ['cliente', 'detalles'],
    });

    if (!cotizacion) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    return cotizacion;
  }

  async update(id: string, dto: ActualizarCotizacionDto): Promise<Cotizacion> {
    return this.dataSource.transaction(async (manager) => {
      const cotizacion = await manager.getRepository(Cotizacion).findOne({
        where: { id },
        relations: ['detalles'],
      });

      if (!cotizacion) {
        throw new NotFoundException('Cotizacion no encontrada');
      }

      if (dto.detalles) {
        await manager.getRepository(DetalleCotizacion).delete({ cotizacionId: id });

        for (const detalle of dto.detalles) {
          const descripcion = await this.resolverDescripcionVariante(
            detalle.varianteId,
            detalle.descripcion,
          );
          const productoId = await this.resolverProductoIdPorVariante(detalle.varianteId);
          if (!productoId) {
            throw new NotFoundException(`Variante no encontrada: ${detalle.varianteId}`);
          }
          const subtotal = this.redondear(
            Number(detalle.cantidad) * Number(detalle.precioUnitario) -
              Number(detalle.descuento ?? 0),
          );

          await manager.getRepository(DetalleCotizacion).save(
            manager.getRepository(DetalleCotizacion).create({
              cotizacionId: id,
              varianteId: detalle.varianteId,
              productoId,
              descripcion,
              cantidad: detalle.cantidad,
              precioUnitario: this.redondear(Number(detalle.precioUnitario)),
              descuento: this.redondear(Number(detalle.descuento ?? 0)),
              subtotal,
            }),
          );
        }

        const totales = this.calcularTotales(dto.detalles, dto.descuento ?? cotizacion.descuento);
        cotizacion.subtotal = totales.subtotal;
        cotizacion.descuento = totales.descuento;
        cotizacion.impuestos = totales.impuestos;
        cotizacion.total = totales.total;
      }

      if (dto.clienteId !== undefined) cotizacion.clienteId = dto.clienteId;
      if (dto.estado !== undefined) cotizacion.estado = dto.estado;
      if (dto.fechaVigencia !== undefined) cotizacion.fechaVigencia = dto.fechaVigencia;
      if (dto.notasCliente !== undefined) cotizacion.notasCliente = dto.notasCliente || null;
      if (dto.terminosCondiciones !== undefined) {
        cotizacion.terminosCondiciones = dto.terminosCondiciones || null;
      }

      await manager.getRepository(Cotizacion).save(cotizacion);
      return this.findOne(id);
    });
  }

  async remove(id: string): Promise<void> {
    const cotizacion = await this.findOne(id);
    await this.cotizacionesRepository.softRemove(cotizacion);
  }

  async convertirAPedido(cotizacionId: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const cotizacion = await manager.getRepository(Cotizacion).findOne({
        where: { id: cotizacionId },
        relations: ['detalles'],
      });

      if (!cotizacion) {
        throw new NotFoundException('Cotizacion no encontrada');
      }

      const numero = await this.generarNumeroPedido(manager);

      const pedido = await manager.getRepository(Pedido).save(
        manager.getRepository(Pedido).create({
          numero,
          cotizacionId: cotizacion.id,
          clienteId: cotizacion.clienteId,
          estado: EstadoPedido.PENDIENTE,
          subtotal: cotizacion.subtotal,
          descuento: cotizacion.descuento,
          impuestos: cotizacion.impuestos,
          total: cotizacion.total,
          creadoPorId: cotizacion.creadoPorId,
        }),
      );

      for (const detalle of cotizacion.detalles) {
        await manager.getRepository(DetallePedido).save(
          manager.getRepository(DetallePedido).create({
            pedidoId: pedido.id,
            varianteId: detalle.varianteId,
            descripcion: detalle.descripcion,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
            descuento: detalle.descuento,
            subtotal: detalle.subtotal,
          }),
        );
      }

      cotizacion.estado = EstadoCotizacion.CONVERTIDA;
      await manager.getRepository(Cotizacion).save(cotizacion);

      const pedidoCreado = await manager.getRepository(Pedido).findOne({
        where: { id: pedido.id },
        relations: ['detalles', 'cliente'],
      });

      if (!pedidoCreado) {
        throw new NotFoundException('No se pudo cargar el pedido convertido');
      }

      return pedidoCreado;
    });
  }

  async getPDF(cotizacionId: string): Promise<string> {
    const cotizacion = await this.findOne(cotizacionId);
    const clienteNombre = [cotizacion.cliente?.nombre, cotizacion.cliente?.apellido]
      .filter(Boolean)
      .join(' ')
      .trim();

    const lineas = cotizacion.detalles.map((item, idx) => {
      const linea = idx + 1;
      return `${linea}. ${item.descripcion}\n   ${item.cantidad} x ${Number(item.precioUnitario).toFixed(2)}  Desc: ${Number(item.descuento).toFixed(2)}  Subtotal: ${Number(item.subtotal).toFixed(2)}`;
    });

    return [
      '========== COTIZACION ==========',
      `Numero: ${cotizacion.numero}`,
      `Cliente: ${clienteNombre || cotizacion.clienteId}`,
      `Estado: ${cotizacion.estado}`,
      `Vigencia: ${cotizacion.fechaVigencia}`,
      '--------------------------------',
      ...lineas,
      '--------------------------------',
      `Subtotal: ${Number(cotizacion.subtotal).toFixed(2)}`,
      `Descuento: ${Number(cotizacion.descuento).toFixed(2)}`,
      `Impuestos: ${Number(cotizacion.impuestos).toFixed(2)}`,
      `Total: ${Number(cotizacion.total).toFixed(2)}`,
      '--------------------------------',
      `Notas: ${cotizacion.notasCliente ?? '-'}`,
      `Terminos: ${cotizacion.terminosCondiciones ?? '-'}`,
      '================================',
    ].join('\n');
  }
}
