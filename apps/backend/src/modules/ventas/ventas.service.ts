import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta, MetodoPago, TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CierreCaja } from '../caja/entities/cierre-caja.entity';
import { InventarioService } from '../inventario/inventario.service';
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
    @InjectRepository(CierreCaja)
    private readonly cajaRepository: Repository<CierreCaja>,
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

  private async obtenerCajaAbierta(sedeId: string): Promise<CierreCaja> {
    const cajaAbierta = await this.cajaRepository.findOne({
      where: {
        sedeId,
        estado: EstadoCaja.ABIERTA,
        activo: true,
      },
      order: { fechaApertura: 'DESC' },
    });

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
        estado: EstadoVenta.PENDIENTE,
        observaciones: dto.observaciones ?? null,
        activo: true,
      });

      const ventaGuardada = await manager.getRepository(Venta).save(ventaEntity);

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
          cantidad: item.cantidad,
          precioUnitario,
          descuentoItem,
          subtotal: subtotalItem,
          activo: true,
        });

        await manager.getRepository(DetalleVenta).save(detalle);

        await this.inventarioService.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.SALIDA,
            varianteId: item.varianteId,
            sedeId: dto.sedeId,
            cantidad: item.cantidad,
            motivo: `Salida por venta ${numero}`,
          },
          usuarioId,
          manager,
        );
      }

      ventaGuardada.subtotal = subtotal;
      ventaGuardada.impuesto = impuesto;
      ventaGuardada.total = subtotal + impuesto - descuentoGeneral;

      if (ventaGuardada.total < 0) {
        throw new BadRequestException('El total de la venta no puede ser negativo');
      }

      ventaGuardada.estado = EstadoVenta.COMPLETADA;
      const ventaCompleta = await manager.getRepository(Venta).save(ventaGuardada);

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
          activo: true,
        },
      });

      const caja = await manager.getRepository(CierreCaja).findOne({
        where: { id: cajaAbierta.id, activo: true },
      });

      if (caja) {
        caja.totalVentas = ventasCompletadas.reduce((acc, item) => acc + Number(item.total), 0);
        caja.totalEfectivo = ventasCompletadas
          .filter((item) => item.metodoPago === MetodoPago.EFECTIVO)
          .reduce((acc, item) => acc + Number(item.total), 0);
        await manager.getRepository(CierreCaja).save(caja);
      }

      return ventaCompleta;
    });

    return this.getVentaById(venta.id);
  }

  async anularVenta(ventaId: string, dto: AnularVentaDto, usuarioId: string): Promise<Venta> {
    return this.dataSource.transaction(async (manager) => {
      const venta = await manager.getRepository(Venta).findOne({
        where: { id: ventaId, activo: true },
        relations: ['detalles'],
      });

      if (!venta) {
        throw new NotFoundException('Venta no encontrada');
      }

      if (venta.estado === EstadoVenta.ANULADA) {
        throw new BadRequestException('La venta ya se encuentra anulada');
      }

      for (const detalle of venta.detalles.filter((item) => item.activo)) {
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

      const ventasCompletadas = await manager.getRepository(Venta).find({
        where: {
          cajaId: venta.cajaId,
          estado: EstadoVenta.COMPLETADA,
          activo: true,
        },
      });
      const caja = await manager.getRepository(CierreCaja).findOne({
        where: { id: venta.cajaId, activo: true },
      });
      if (caja && caja.estado === EstadoCaja.ABIERTA) {
        caja.totalVentas = ventasCompletadas.reduce((acc, item) => acc + Number(item.total), 0);
        caja.totalEfectivo = ventasCompletadas
          .filter((item) => item.metodoPago === MetodoPago.EFECTIVO)
          .reduce((acc, item) => acc + Number(item.total), 0);
        await manager.getRepository(CierreCaja).save(caja);
      }

      return ventaAnulada;
    });
  }

  async getVentasByFecha(sedeId: string, fecha?: string): Promise<Venta[]> {
    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.detalles', 'detalle', 'detalle.activo = true')
      .where('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.activo = true')
      .orderBy('venta.createdAt', 'DESC');

    if (fecha) {
      query.andWhere('DATE(venta.createdAt) = :fecha', { fecha });
    }

    return query.getMany();
  }

  async getVentaById(id: string): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id, activo: true },
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

    const detallesActivos = venta.detalles.filter((detalle) => detalle.activo);
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
