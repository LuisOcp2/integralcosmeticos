import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CrearPedidoDto } from './dto/crear-pedido.dto';
import { ActualizarPedidoDto } from './dto/actualizar-pedido.dto';
import { FiltrosPedidoDto } from './dto/filtros-pedido.dto';
import { Pedido, EstadoPedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { Factura, EstadoFactura } from './entities/factura.entity';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private readonly detallePedidosRepository: Repository<DetallePedido>,
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async generarNumeroPedido(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('pedidos_numero_seq')::text, 6, '0') AS seq",
    );
    return `PED-${year}-${seq}`;
  }

  private async generarNumeroFactura(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS facturas_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('facturas_numero_seq')::text, 6, '0') AS seq",
    );
    return `FAC-${year}-${seq}`;
  }

  private calcularTotales(detalles: DetallePedido[], descuentoGlobal = 0) {
    const subtotal = detalles.reduce(
      (acc, item) => acc + Number(item.cantidad) * Number(item.precioUnitario),
      0,
    );
    const descuento =
      detalles.reduce((acc, item) => acc + Number(item.descuento || 0), 0) + descuentoGlobal;
    const base = Math.max(subtotal - descuento, 0);
    const impuestos = base * 0.19;
    const total = base + impuestos;

    return {
      subtotal: this.redondear(subtotal),
      descuento: this.redondear(descuento),
      impuestos: this.redondear(impuestos),
      total: this.redondear(total),
    };
  }

  async create(dto: CrearPedidoDto, userId: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const numero = await this.generarNumeroPedido(manager);

      const detalles = dto.detalles.map((item) =>
        manager.getRepository(DetallePedido).create({
          varianteId: item.varianteId,
          descripcion: (item.descripcion || item.varianteId).slice(0, 200),
          cantidad: item.cantidad,
          precioUnitario: this.redondear(Number(item.precioUnitario)),
          descuento: this.redondear(Number(item.descuento ?? 0)),
          subtotal: this.redondear(
            Number(item.cantidad) * Number(item.precioUnitario) - Number(item.descuento ?? 0),
          ),
        }),
      );

      const totales = this.calcularTotales(detalles, Number(dto.descuento ?? 0));

      const pedido = await manager.getRepository(Pedido).save(
        manager.getRepository(Pedido).create({
          numero,
          cotizacionId: dto.cotizacionId ?? null,
          clienteId: dto.clienteId,
          estado: EstadoPedido.PENDIENTE,
          direccionEntrega: dto.direccionEntrega?.trim() || null,
          fechaEntregaEsperada: dto.fechaEntregaEsperada ?? null,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          impuestos: totales.impuestos,
          total: totales.total,
          creadoPorId: userId,
        }),
      );

      for (const detalle of detalles) {
        detalle.pedidoId = pedido.id;
      }
      await manager.getRepository(DetallePedido).save(detalles);

      const creado = await manager.getRepository(Pedido).findOne({
        where: { id: pedido.id },
        relations: ['detalles', 'cliente', 'cotizacion'],
      });

      if (!creado) {
        throw new NotFoundException('No se pudo cargar el pedido creado');
      }

      return creado;
    });
  }

  async findAll(query: FiltrosPedidoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.pedidosRepository
      .createQueryBuilder('pedido')
      .leftJoinAndSelect('pedido.cliente', 'cliente')
      .leftJoinAndSelect('pedido.cotizacion', 'cotizacion')
      .orderBy('pedido.createdAt', 'DESC');

    if (query.estado) {
      qb.andWhere('pedido.estado = :estado', { estado: query.estado });
    }

    if (query.clienteId) {
      qb.andWhere('pedido.clienteId = :clienteId', { clienteId: query.clienteId });
    }

    if (query.q?.trim()) {
      qb.andWhere('LOWER(pedido.numero) LIKE :q', { q: `%${query.q.trim().toLowerCase()}%` });
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

  async findOne(id: string): Promise<Pedido> {
    const pedido = await this.pedidosRepository.findOne({
      where: { id },
      relations: ['detalles', 'cliente', 'cotizacion'],
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return pedido;
  }

  async update(id: string, dto: ActualizarPedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.getRepository(Pedido).findOne({
        where: { id },
        relations: ['detalles'],
      });

      if (!pedido) {
        throw new NotFoundException('Pedido no encontrado');
      }

      if (dto.detalles) {
        await manager.getRepository(DetallePedido).delete({ pedidoId: id });

        const nuevosDetalles = dto.detalles.map((item) =>
          manager.getRepository(DetallePedido).create({
            pedidoId: id,
            varianteId: item.varianteId,
            descripcion: (item.descripcion || item.varianteId).slice(0, 200),
            cantidad: item.cantidad,
            precioUnitario: this.redondear(Number(item.precioUnitario)),
            descuento: this.redondear(Number(item.descuento ?? 0)),
            subtotal: this.redondear(
              Number(item.cantidad) * Number(item.precioUnitario) - Number(item.descuento ?? 0),
            ),
          }),
        );
        await manager.getRepository(DetallePedido).save(nuevosDetalles);

        const totales = this.calcularTotales(
          nuevosDetalles,
          Number(dto.descuento ?? pedido.descuento),
        );
        pedido.subtotal = totales.subtotal;
        pedido.descuento = totales.descuento;
        pedido.impuestos = totales.impuestos;
        pedido.total = totales.total;
      }

      if (dto.cotizacionId !== undefined) pedido.cotizacionId = dto.cotizacionId;
      if (dto.clienteId !== undefined) pedido.clienteId = dto.clienteId;
      if (dto.estado !== undefined) pedido.estado = dto.estado;
      if (dto.direccionEntrega !== undefined)
        pedido.direccionEntrega = dto.direccionEntrega || null;
      if (dto.fechaEntregaEsperada !== undefined) {
        pedido.fechaEntregaEsperada = dto.fechaEntregaEsperada || null;
      }

      await manager.getRepository(Pedido).save(pedido);
      return this.findOne(id);
    });
  }

  async cambiarEstado(id: string, estado: EstadoPedido, nota?: string): Promise<Pedido> {
    const pedido = await this.findOne(id);
    pedido.estado = estado;

    if (nota?.trim()) {
      const base = pedido.direccionEntrega ? `${pedido.direccionEntrega}\n` : '';
      pedido.direccionEntrega = `${base}[${new Date().toISOString()}] ${nota.trim()}`;
    }

    await this.pedidosRepository.save(pedido);
    return this.findOne(id);
  }

  async convertirAFactura(pedidoId: string): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.getRepository(Pedido).findOne({
        where: { id: pedidoId },
        relations: ['detalles'],
      });

      if (!pedido) {
        throw new NotFoundException('Pedido no encontrado');
      }

      const numero = await this.generarNumeroFactura(manager);
      const hoy = new Date().toISOString().slice(0, 10);
      const vencimiento = new Date();
      vencimiento.setDate(vencimiento.getDate() + 30);

      const factura = await manager.getRepository(Factura).save(
        manager.getRepository(Factura).create({
          numero,
          pedidoId: pedido.id,
          clienteId: pedido.clienteId,
          estado: EstadoFactura.EMITIDA,
          fechaEmision: hoy,
          fechaVencimiento: vencimiento.toISOString().slice(0, 10),
          subtotal: pedido.subtotal,
          descuento: pedido.descuento,
          impuestos: pedido.impuestos,
          retencion: 0,
          total: pedido.total,
          saldo: pedido.total,
          creadoPorId: pedido.creadoPorId,
        }),
      );

      const creada = await manager.getRepository(Factura).findOne({
        where: { id: factura.id },
        relations: ['cliente', 'pedido'],
      });

      if (!creada) {
        throw new NotFoundException('No se pudo cargar la factura creada');
      }

      return creada;
    });
  }
}
