import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CrearFacturaDto } from './dto/crear-factura.dto';
import { ActualizarFacturaDto } from './dto/actualizar-factura.dto';
import { FiltrosFacturaDto } from './dto/filtros-factura.dto';
import { RegistrarPagoFacturaDto } from './dto/registrar-pago-factura.dto';
import { Factura, EstadoFactura } from './entities/factura.entity';
import { PagoFactura } from './entities/pago-factura.entity';

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
    @InjectRepository(PagoFactura)
    private readonly pagosRepository: Repository<PagoFactura>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async generarNumeroFactura(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS facturas_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('facturas_numero_seq')::text, 6, '0') AS seq",
    );
    return `FAC-${year}-${seq}`;
  }

  async create(dto: CrearFacturaDto, userId: string): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      const numero = await this.generarNumeroFactura(manager);
      const subtotal = this.redondear(Number(dto.subtotal ?? 0));
      const descuento = this.redondear(Number(dto.descuento ?? 0));
      const impuestos = this.redondear(Number(dto.impuestos ?? 0));
      const retencion = this.redondear(Number(dto.retencion ?? 0));
      const total = this.redondear(Math.max(subtotal - descuento + impuestos - retencion, 0));

      const factura = await manager.getRepository(Factura).save(
        manager.getRepository(Factura).create({
          numero,
          pedidoId: dto.pedidoId ?? null,
          clienteId: dto.clienteId,
          estado: EstadoFactura.BORRADOR,
          fechaEmision: dto.fechaEmision,
          fechaVencimiento: dto.fechaVencimiento,
          subtotal,
          descuento,
          impuestos,
          retencion,
          total,
          saldo: total,
          creadoPorId: userId,
        }),
      );

      const creada = await manager.getRepository(Factura).findOne({
        where: { id: factura.id },
        relations: ['cliente', 'pedido', 'pagos'],
      });

      if (!creada) {
        throw new NotFoundException('No se pudo cargar la factura creada');
      }

      return creada;
    });
  }

  async findAll(query: FiltrosFacturaDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.facturasRepository
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .leftJoinAndSelect('factura.pedido', 'pedido')
      .orderBy('factura.createdAt', 'DESC');

    if (query.estado) {
      qb.andWhere('factura.estado = :estado', { estado: query.estado });
    }

    if (query.clienteId) {
      qb.andWhere('factura.clienteId = :clienteId', { clienteId: query.clienteId });
    }

    if (query.q?.trim()) {
      qb.andWhere('LOWER(factura.numero) LIKE :q', { q: `%${query.q.trim().toLowerCase()}%` });
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

  async findOne(id: string): Promise<Factura> {
    const factura = await this.facturasRepository.findOne({
      where: { id },
      relations: ['cliente', 'pedido', 'pagos'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return factura;
  }

  async update(id: string, dto: ActualizarFacturaDto): Promise<Factura> {
    const factura = await this.findOne(id);

    if (dto.estado !== undefined) factura.estado = dto.estado;
    if (dto.pedidoId !== undefined) factura.pedidoId = dto.pedidoId;
    if (dto.clienteId !== undefined) factura.clienteId = dto.clienteId;
    if (dto.fechaEmision !== undefined) factura.fechaEmision = dto.fechaEmision;
    if (dto.fechaVencimiento !== undefined) factura.fechaVencimiento = dto.fechaVencimiento;

    if (
      dto.subtotal !== undefined ||
      dto.descuento !== undefined ||
      dto.impuestos !== undefined ||
      dto.retencion !== undefined
    ) {
      const subtotal = this.redondear(Number(dto.subtotal ?? factura.subtotal));
      const descuento = this.redondear(Number(dto.descuento ?? factura.descuento));
      const impuestos = this.redondear(Number(dto.impuestos ?? factura.impuestos));
      const retencion = this.redondear(Number(dto.retencion ?? factura.retencion));
      const total = this.redondear(Math.max(subtotal - descuento + impuestos - retencion, 0));
      const pagado = this.redondear(Number(factura.total) - Number(factura.saldo));

      factura.subtotal = subtotal;
      factura.descuento = descuento;
      factura.impuestos = impuestos;
      factura.retencion = retencion;
      factura.total = total;
      factura.saldo = this.redondear(Math.max(total - pagado, 0));
    }

    await this.facturasRepository.save(factura);
    return this.findOne(id);
  }

  async registrarPago(
    facturaId: string,
    dto: RegistrarPagoFacturaDto,
    userId: string,
  ): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      const factura = await manager.getRepository(Factura).findOne({ where: { id: facturaId } });
      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }

      const monto = this.redondear(Number(dto.monto));
      if (monto <= 0) {
        throw new BadRequestException('El monto del pago debe ser mayor a 0');
      }

      if (monto > Number(factura.saldo)) {
        throw new BadRequestException('El monto no puede exceder el saldo pendiente');
      }

      await manager.getRepository(PagoFactura).save(
        manager.getRepository(PagoFactura).create({
          facturaId,
          fecha: dto.fecha,
          monto,
          metodoPago: dto.metodoPago,
          referencia: dto.referencia?.trim() || null,
          notas: dto.notas?.trim() || null,
          registradoPorId: userId,
        }),
      );

      factura.saldo = this.redondear(Number(factura.saldo) - monto);
      if (factura.saldo === 0) {
        factura.estado = EstadoFactura.PAGADA;
        factura.fechaPago = dto.fecha;
      } else {
        factura.estado = EstadoFactura.PAGADA_PARCIAL;
      }

      await manager.getRepository(Factura).save(factura);

      const actualizada = await manager.getRepository(Factura).findOne({
        where: { id: facturaId },
        relations: ['cliente', 'pedido', 'pagos'],
      });

      if (!actualizada) {
        throw new NotFoundException('No se pudo cargar la factura actualizada');
      }

      return actualizada;
    });
  }

  async getPagos(facturaId: string): Promise<PagoFactura[]> {
    await this.findOne(facturaId);
    return this.pagosRepository.find({
      where: { facturaId },
      order: { fecha: 'DESC', createdAt: 'DESC' },
    });
  }

  async getCuentasPorCobrar(vencidas = false): Promise<Factura[]> {
    const qb = this.facturasRepository
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .where('factura.saldo > 0')
      .orderBy('factura.fechaVencimiento', 'ASC');

    if (vencidas) {
      qb.andWhere('factura.fechaVencimiento < :hoy', {
        hoy: new Date().toISOString().slice(0, 10),
      });
    }

    return qb.getMany();
  }

  async getEstadoCuentaCliente(clienteId: string): Promise<Factura[]> {
    return this.facturasRepository.find({
      where: { clienteId },
      relations: ['pagos'],
      order: { fechaEmision: 'DESC', createdAt: 'DESC' },
    });
  }
}
