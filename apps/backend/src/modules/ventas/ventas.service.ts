import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EstadoVenta, MetodoPago, TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
import { InventarioService } from '../inventario/inventario.service';
import { StockSede } from '../inventario/entities/stock-sede.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Sede } from '../sedes/entities/sede.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detalleVentasRepository: Repository<DetalleVenta>,
    @InjectRepository(SesionCaja)
    private readonly cajaRepository: Repository<SesionCaja>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    private readonly inventarioService: InventarioService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private aplicarMontosSegunMetodo(
    metodoPago: MetodoPago,
    total: number,
    splitPago?: CreateVentaDto['splitPago'],
  ): Pick<Venta, 'montoEfectivo' | 'montoTarjeta' | 'montoTransferencia' | 'montoOtro'> {
    const montos = {
      montoEfectivo: 0,
      montoTarjeta: 0,
      montoTransferencia: 0,
      montoOtro: 0,
    };

    if (metodoPago === MetodoPago.COMBINADO) {
      if (!splitPago) {
        throw new BadRequestException('Debe enviar splitPago para metodo COMBINADO');
      }

      const totalSplit =
        Number(splitPago.efectivo ?? 0) +
        Number(splitPago.tarjeta ?? 0) +
        Number(splitPago.transferencia ?? 0);

      if (Math.abs(totalSplit - total) > 0.01) {
        throw new BadRequestException(
          'La suma del split de pago debe coincidir con el total de la venta',
        );
      }

      return {
        montoEfectivo: Number(splitPago.efectivo ?? 0),
        montoTarjeta: Number(splitPago.tarjeta ?? 0),
        montoTransferencia: Number(splitPago.transferencia ?? 0),
        montoOtro: 0,
      };
    }

    if (splitPago) {
      throw new BadRequestException('splitPago solo aplica cuando el metodo es COMBINADO');
    }

    if (metodoPago === MetodoPago.EFECTIVO) {
      montos.montoEfectivo = total;
      return montos;
    }

    if ([MetodoPago.TARJETA_CREDITO, MetodoPago.TARJETA_DEBITO].includes(metodoPago)) {
      montos.montoTarjeta = total;
      return montos;
    }

    if (metodoPago === MetodoPago.TRANSFERENCIA) {
      montos.montoTransferencia = total;
      return montos;
    }

    throw new BadRequestException('Metodo de pago no soportado');
  }

  private async generarNumeroVenta(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    const prefijo = `VTA-${year}-`;

    const ultimaVenta = await manager
      .getRepository(Venta)
      .createQueryBuilder('venta')
      .where('venta.numero LIKE :prefijo', { prefijo: `${prefijo}%` })
      .orderBy('venta.numero', 'DESC')
      .getOne();

    const ultimoCorrelativo = ultimaVenta ? Number(ultimaVenta.numero.split('-').at(-1) ?? 0) : 0;
    const siguiente = String(ultimoCorrelativo + 1).padStart(5, '0');

    return `${prefijo}${siguiente}`;
  }

  private async obtenerCajaAbierta(sedeId: string): Promise<SesionCaja> {
    const cajaAbierta = await this.cajaRepository
      .createQueryBuilder('sesion')
      .innerJoin('cajas', 'caja', 'caja.id = sesion."cajaId"')
      .where('caja."sedeId" = :sedeId', { sedeId })
      .andWhere('caja.activa = true')
      .andWhere('sesion.activa = true')
      .orderBy('sesion.fecha_apertura', 'DESC')
      .getOne();

    if (!cajaAbierta) {
      throw new BadRequestException('No hay una caja abierta para la sede de la venta');
    }

    return cajaAbierta;
  }

  async crearVenta(dto: CreateVentaDto, usuarioId: string): Promise<Venta> {
    const cajaAbierta = await this.obtenerCajaAbierta(dto.sedeId);

    const venta = await this.dataSource.transaction(async (manager) => {
      const numero = await this.generarNumeroVenta(manager);

      let subtotal = 0;
      let impuesto = 0;
      const descuentoGeneral = Number(dto.descuento ?? 0);

      const ventaEntity = manager.getRepository(Venta).create({
        numero,
        sedeId: dto.sedeId,
        usuarioId,
        clienteId: dto.clienteId ?? null,
        cajaId: cajaAbierta.id,
        subtotal: 0,
        descuento: descuentoGeneral,
        impuesto: 0,
        total: 0,
        metodoPago: dto.metodoPago,
        montoEfectivo: 0,
        montoTarjeta: 0,
        montoTransferencia: 0,
        montoOtro: 0,
        estado: EstadoVenta.PENDIENTE,
        observaciones: dto.observaciones ?? null,
      });

      const ventaGuardada = await manager.getRepository(Venta).save(ventaEntity);

      const stockDisponiblePorVariante = new Map<string, number>();

      for (const item of dto.items) {
        const variante = await manager.getRepository(Variante).findOne({
          where: { id: item.varianteId, activo: true },
        });
        if (!variante) {
          throw new NotFoundException(`Variante no encontrada: ${item.varianteId}`);
        }

        const producto = await manager.getRepository(Producto).findOne({
          where: { id: variante.productoId, activo: true },
        });
        if (!producto) {
          throw new NotFoundException(`Producto no encontrado para variante ${item.varianteId}`);
        }

        const precioUnitario = Number(producto.precioBase) + Number(variante.precioExtra);
        const descuentoItem = Number(item.descuentoItem ?? 0);
        const subtotalItem = precioUnitario * item.cantidad - descuentoItem;

        if (subtotalItem < 0) {
          throw new BadRequestException('El subtotal de un item no puede ser negativo');
        }

        subtotal += subtotalItem;
        impuesto += subtotalItem * (Number(producto.iva) / 100);

        const detalle = manager.getRepository(DetalleVenta).create({
          ventaId: ventaGuardada.id,
          varianteId: item.varianteId,
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario,
          precioCostoSnap: Number(producto.precioCosto),
          descuentoItem,
          impuestoItem: subtotalItem * (Number(producto.iva) / 100),
          subtotal: subtotalItem,
        });

        if (!stockDisponiblePorVariante.has(item.varianteId)) {
          const stock = await manager
            .getRepository(StockSede)
            .createQueryBuilder('stock')
            .setLock('pessimistic_write')
            .where('stock.varianteId = :varianteId', { varianteId: item.varianteId })
            .andWhere('stock.sedeId = :sedeId', { sedeId: dto.sedeId })
            .getOne();

          stockDisponiblePorVariante.set(item.varianteId, stock?.cantidad ?? 0);
        }

        const stockRestante = Number(stockDisponiblePorVariante.get(item.varianteId) ?? 0);
        if (stockRestante < item.cantidad) {
          throw new BadRequestException('Stock insuficiente para uno de los items de la venta');
        }

        stockDisponiblePorVariante.set(item.varianteId, stockRestante - item.cantidad);

        await manager.getRepository(DetalleVenta).save(detalle);
      }

      ventaGuardada.subtotal = subtotal;
      ventaGuardada.impuesto = impuesto;
      ventaGuardada.total = subtotal + impuesto - descuentoGeneral;

      if (ventaGuardada.total < 0) {
        throw new BadRequestException('El total de la venta no puede ser negativo');
      }

      if (descuentoGeneral > subtotal + impuesto) {
        throw new BadRequestException(
          'El descuento general no puede superar el subtotal + impuesto',
        );
      }

      const montos = this.aplicarMontosSegunMetodo(
        dto.metodoPago,
        Number(ventaGuardada.total),
        dto.splitPago,
      );
      ventaGuardada.montoEfectivo = montos.montoEfectivo;
      ventaGuardada.montoTarjeta = montos.montoTarjeta;
      ventaGuardada.montoTransferencia = montos.montoTransferencia;
      ventaGuardada.montoOtro = montos.montoOtro;

      ventaGuardada.estado = EstadoVenta.COMPLETADA;
      const ventaCompleta = await manager.getRepository(Venta).save(ventaGuardada);

      const cantidadPorVariante = dto.items.reduce((acc, item) => {
        acc.set(item.varianteId, (acc.get(item.varianteId) ?? 0) + item.cantidad);
        return acc;
      }, new Map<string, number>());

      for (const [varianteId, cantidad] of cantidadPorVariante) {
        await this.inventarioService.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.SALIDA,
            varianteId,
            sedeId: dto.sedeId,
            cantidad,
            motivo: `Venta ${ventaCompleta.numero}`,
          },
          usuarioId,
          manager,
        );
      }

      if (dto.clienteId) {
        const cliente = await manager.getRepository(Cliente).findOne({
          where: { id: dto.clienteId, activo: true },
        });
        if (!cliente) {
          throw new NotFoundException('Cliente no encontrado para sumar puntos');
        }

        const puntos = Math.floor(Number(ventaCompleta.total) / 1000);
        cliente.puntosFidelidad += puntos;
        await manager.getRepository(Cliente).save(cliente);
      }

      const ventasCompletadas = await manager.getRepository(Venta).find({
        where: {
          cajaId: cajaAbierta.id,
          estado: EstadoVenta.COMPLETADA,
        },
      });

      const caja = await manager.getRepository(SesionCaja).findOne({
        where: { id: cajaAbierta.id, activo: true },
      });

      if (caja) {
        caja.totalVentas = ventasCompletadas.reduce((acc, item) => acc + Number(item.total), 0);
        await manager.getRepository(SesionCaja).save(caja);
      }

      return ventaCompleta;
    });

    return this.getVentaById(venta.id);
  }

  async anularVenta(ventaId: string, dto: AnularVentaDto, usuarioId: string): Promise<Venta> {
    return this.dataSource.transaction(async (manager) => {
      const venta = await manager.getRepository(Venta).findOne({
        where: { id: ventaId },
        relations: ['detalles'],
      });

      if (!venta) {
        throw new NotFoundException('Venta no encontrada');
      }

      if (venta.estado === EstadoVenta.ANULADA) {
        throw new BadRequestException('La venta ya se encuentra anulada');
      }

      if (venta.estado !== EstadoVenta.COMPLETADA) {
        throw new BadRequestException('Solo se pueden anular ventas completadas');
      }

      for (const detalle of venta.detalles) {
        await this.inventarioService.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.DEVOLUCION,
            varianteId: detalle.varianteId,
            sedeId: venta.sedeId,
            cantidad: detalle.cantidad,
            motivo: `Anulacion venta ${venta.numero}. ${dto.motivo}`,
          },
          usuarioId,
          manager,
        );
      }

      venta.estado = EstadoVenta.ANULADA;
      venta.observaciones = venta.observaciones
        ? `${venta.observaciones}\nANULADA: ${dto.motivo}`
        : `ANULADA: ${dto.motivo}`;

      const ventaAnulada = await manager.getRepository(Venta).save(venta);

      if (venta.clienteId) {
        const cliente = await manager
          .getRepository(Cliente)
          .findOne({ where: { id: venta.clienteId } });
        if (cliente) {
          const puntosOtorgados = Math.floor(Number(venta.total) / 1000);
          cliente.puntosFidelidad = Math.max(0, cliente.puntosFidelidad - puntosOtorgados);
          await manager.getRepository(Cliente).save(cliente);
        }
      }

      const ventasCompletadas = venta.cajaId
        ? await manager.getRepository(Venta).find({
            where: {
              cajaId: venta.cajaId,
              estado: EstadoVenta.COMPLETADA,
            },
          })
        : [];
      const caja = venta.cajaId
        ? await manager.getRepository(SesionCaja).findOne({
            where: { id: venta.cajaId },
          })
        : null;
      if (caja && caja.activo) {
        caja.totalVentas = ventasCompletadas.reduce((acc, item) => acc + Number(item.total), 0);
        await manager.getRepository(SesionCaja).save(caja);
      }

      return ventaAnulada;
    });
  }

  async getVentasByFecha(sedeId?: string, fecha?: string): Promise<Venta[]> {
    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.detalles', 'detalle')
      .orderBy('venta.createdAt', 'DESC');

    if (sedeId) {
      query.andWhere('venta.sedeId = :sedeId', { sedeId });
    }

    if (fecha) {
      query.andWhere('DATE(venta.createdAt) = :fecha', { fecha });
    }

    return query.getMany();
  }

  async getVentaById(id: string): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['detalles'],
    });
    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }

    return venta;
  }

  async generarTicketPDF(ventaId: string): Promise<Buffer> {
    const venta = await this.getVentaById(ventaId);
    const sede = await this.sedesRepository.findOne({ where: { id: venta.sedeId, activo: true } });

    const detallesActivos = venta.detalles;
    const variantes = await this.variantesRepository.find({
      where: detallesActivos.map((item) => ({ id: item.varianteId, activo: true })),
    });
    const variantesMap = new Map(variantes.map((v) => [v.id, v]));

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      doc.fontSize(16).text(sede?.nombre ?? 'Integral Cosmeticos', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Direccion: ${sede?.direccion ?? 'N/A'}`, { align: 'center' });
      doc.text(`Fecha/Hora: ${venta.createdAt.toLocaleString()}`, { align: 'center' });
      doc.text(`Numero de venta: ${venta.numero}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(11).text('Detalle de items', { underline: true });
      doc.moveDown(0.5);

      for (const item of detallesActivos) {
        const variante = variantesMap.get(item.varianteId);
        doc
          .fontSize(10)
          .text(`${variante?.nombre ?? item.varianteId}`)
          .text(
            `Cant: ${item.cantidad}  PU: ${Number(item.precioUnitario).toFixed(2)}  Sub: ${Number(item.subtotal).toFixed(2)}`,
          )
          .moveDown(0.3);
      }

      doc.moveDown();
      doc.text(`Subtotal: ${Number(venta.subtotal).toFixed(2)} COP`);
      doc.text(`Descuento: ${Number(venta.descuento).toFixed(2)} COP`);
      doc.text(`IVA: ${Number(venta.impuesto).toFixed(2)} COP`);
      doc.fontSize(12).text(`TOTAL: ${Number(venta.total).toFixed(2)} COP`);
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Metodo de pago: ${venta.metodoPago}`);
      doc.text('Gracias por su compra', { align: 'center' });

      doc.end();
    });
  }
}
