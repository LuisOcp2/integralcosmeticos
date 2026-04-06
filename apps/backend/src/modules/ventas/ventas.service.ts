import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta, MetodoPago, Rol, TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, Repository } from 'typeorm';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AnularVentaDto } from './dto/anular-venta.dto';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
import { Caja } from '../caja/entities/caja.entity';
import { InventarioService } from '../inventario/inventario.service';
import { StockSede } from '../inventario/entities/stock-sede.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ClientesService } from '../clientes/clientes.service';
import { ContabilidadService } from '../contabilidad/contabilidad.service';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detalleVentasRepository: Repository<DetalleVenta>,
    @InjectRepository(SesionCaja)
    private readonly cajaRepository: Repository<SesionCaja>,
    @InjectRepository(Caja)
    private readonly cajasRepository: Repository<Caja>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly inventarioService: InventarioService,
    private readonly clientesService: ClientesService,
    private readonly contabilidadService: ContabilidadService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async generarNumeroVenta(manager: DataSource['manager']): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('ventas_numero_seq')::text, 6, '0') AS seq",
    );
    return `VEN-${year}-${seq}`;
  }

  private async obtenerCajaAbierta(cajeroId: string, sedeId: string): Promise<SesionCaja> {
    const cajaActiva = await this.cajasRepository.findOne({ where: { sedeId, activo: true } });
    if (!cajaActiva) {
      throw new BadRequestException('No hay una caja configurada para la sede del usuario');
    }

    const cajaAbierta = await this.cajaRepository.findOne({
      where: {
        cajaId: cajaActiva.id,
        cajeroId,
        estado: EstadoCaja.ABIERTA,
      },
      order: { fechaApertura: 'DESC' },
    });

    if (!cajaAbierta) {
      throw new BadRequestException('No hay una sesion de caja abierta para el cajero');
    }

    return cajaAbierta;
  }

  async crearVenta(dto: CreateVentaDto, cajeroId: string, sedeId?: string | null): Promise<Venta> {
    if (!sedeId) {
      throw new BadRequestException('El usuario no tiene sede asignada para registrar la venta');
    }

    const cajaAbierta = await this.obtenerCajaAbierta(cajeroId, sedeId);
    await this.contabilidadService.validarPeriodoAbiertoPorFecha(new Date());

    const venta = await this.dataSource.transaction(async (manager) => {
      const numero = await this.generarNumeroVenta(manager);

      let subtotal = 0;
      let impuestos = 0;

      const montoPagado = Number(dto.montoPagado ?? dto.montoRecibido ?? 0);
      const notas = dto.notas ?? dto.observaciones ?? null;

      const ventaEntity = manager.getRepository(Venta).create({
        numero,
        sedeId,
        cajeroId,
        clienteId: dto.clienteId ?? null,
        cajaId: cajaAbierta.id,
        estado: EstadoVenta.PENDIENTE,
        subtotal: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
        metodoPago: dto.metodoPago,
        montoPagado,
        cambio: 0,
        notas,
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

        if (!stockDisponiblePorVariante.has(item.varianteId)) {
          const stock = await manager
            .getRepository(StockSede)
            .createQueryBuilder('stock')
            .setLock('pessimistic_write')
            .where('stock.varianteId = :varianteId', { varianteId: item.varianteId })
            .andWhere('stock.sedeId = :sedeId', { sedeId })
            .getOne();

          const cantidadStock = stock?.cantidad ?? 0;
          if (!producto.permitirVentaSinStock && cantidadStock <= 0) {
            throw new BadRequestException(`Sin stock disponible para ${producto.nombre}`);
          }
          stockDisponiblePorVariante.set(item.varianteId, cantidadStock);
        }

        const stockRestante = Number(stockDisponiblePorVariante.get(item.varianteId) ?? 0);
        if (!producto.permitirVentaSinStock && stockRestante < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para ${producto.nombre}`);
        }

        stockDisponiblePorVariante.set(item.varianteId, stockRestante - item.cantidad);

        const precioUnitario = Number(variante.precioVenta ?? variante.precio ?? producto.precio);
        const descuentoItem = Number(item.descuento ?? item.descuentoItem ?? 0);
        const subtotalItemBruto = precioUnitario * item.cantidad;
        const subtotalItem = subtotalItemBruto - descuentoItem;

        if (subtotalItem < 0) {
          throw new BadRequestException('El subtotal de un item no puede ser negativo');
        }

        const aplicaIva = Number(producto.impuesto ?? 0) > 0;
        const impuestoItem = aplicaIva ? subtotalItem * 0.19 : 0;

        subtotal += subtotalItem;
        impuestos += impuestoItem;

        const detalle = manager.getRepository(DetalleVenta).create({
          ventaId: ventaGuardada.id,
          varianteId: item.varianteId,
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario,
          descuento: descuentoItem,
          impuestoItem,
          subtotal: subtotalItem,
        });

        await manager.getRepository(DetalleVenta).save(detalle);
      }

      const total = subtotal + impuestos;
      if (montoPagado < total) {
        throw new BadRequestException('El monto pagado no cubre el total de la venta');
      }

      ventaGuardada.subtotal = subtotal;
      ventaGuardada.impuestos = impuestos;
      ventaGuardada.total = total;
      ventaGuardada.cambio =
        dto.metodoPago === MetodoPago.EFECTIVO || dto.metodoPago === MetodoPago.COMBINADO
          ? montoPagado - total
          : 0;
      ventaGuardada.estado = EstadoVenta.COMPLETADA;

      const ventaCompleta = await manager.getRepository(Venta).save(ventaGuardada);

      for (const item of dto.items) {
        await this.inventarioService.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.SALIDA,
            varianteId: item.varianteId,
            sedeOrigenId: sedeId,
            cantidad: item.cantidad,
            motivo: `Venta ${ventaCompleta.numero}`,
            referencia: ventaCompleta.numero,
          },
          cajeroId,
          manager,
        );
      }

      if (dto.clienteId) {
        const puntos = Math.floor(Number(ventaCompleta.total) / 1000);
        await this.clientesService.sumarPuntosConManager(
          dto.clienteId,
          puntos,
          manager,
          Number(ventaCompleta.total),
        );
      }

      await this.contabilidadService.generarAsientoVenta(ventaCompleta, manager);

      return ventaCompleta;
    });

    return this.getVentaById(venta.id);
  }

  async anularVenta(
    ventaId: string,
    dto: AnularVentaDto,
    usuarioId: string,
    rol: Rol,
  ): Promise<Venta> {
    if (![Rol.ADMIN, Rol.SUPERVISOR].includes(rol)) {
      throw new ForbiddenException('Solo ADMIN o SUPERVISOR pueden anular ventas');
    }

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

      await this.contabilidadService.validarPeriodoAbiertoPorFecha(venta.createdAt);

      for (const detalle of venta.detalles) {
        await this.inventarioService.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.DEVOLUCION,
            varianteId: detalle.varianteId,
            sedeOrigenId: venta.sedeId,
            cantidad: detalle.cantidad,
            motivo: `Anulacion venta ${venta.numero}. ${dto.motivo}`,
            referencia: venta.numero,
          },
          usuarioId,
          manager,
        );
      }

      venta.estado = EstadoVenta.ANULADA;
      venta.motivoAnulacion = dto.motivo;
      venta.anuladaPorId = usuarioId;
      venta.anuladaEn = new Date();

      await this.contabilidadService.generarAsientoReversionVenta(
        venta,
        usuarioId,
        dto.motivo,
        manager,
      );

      return manager.getRepository(Venta).save(venta);
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

  async generarTicketTexto(ventaId: string): Promise<string> {
    const venta = await this.getVentaById(ventaId);
    const [sede, cajero] = await Promise.all([
      this.sedesRepository.findOne({ where: { id: venta.sedeId } }),
      this.usuariosRepository.findOne({ where: { id: venta.cajeroId } }),
    ]);

    const fecha = venta.createdAt.toLocaleString('es-CO', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const dinero = new Intl.NumberFormat('es-CO');
    const padTotal = 14;
    const lineasItems = venta.detalles.map((d) => {
      const totalLinea = dinero.format(Math.round(Number(d.subtotal)));
      const nombre = `${d.varianteId} x${d.cantidad}`;
      const relleno = Math.max(1, 32 - nombre.length - totalLinea.length);
      return `${nombre}${' '.repeat(relleno)}$${totalLinea}`;
    });

    const etiquetaPago =
      venta.metodoPago === MetodoPago.EFECTIVO ? 'Pago efectivo:' : `Pago ${venta.metodoPago}:`;

    return [
      '===== INTEGRAL COSMETICOS =====',
      `Sede: ${sede?.nombre ?? 'N/A'}`,
      `Fecha: ${fecha}`,
      `Ticket: ${venta.numero}`,
      `Cajero: ${cajero ? `${cajero.nombre} ${cajero.apellido}` : 'N/A'}`,
      '================================',
      ...lineasItems,
      '--------------------------------',
      `Subtotal:${' '.repeat(padTotal)}$${dinero.format(Math.round(Number(venta.subtotal)))}`,
      `IVA (19%):${' '.repeat(padTotal)}$${dinero.format(Math.round(Number(venta.impuestos)))}`,
      `TOTAL:${' '.repeat(padTotal + 3)}$${dinero.format(Math.round(Number(venta.total)))}`,
      `${etiquetaPago}${' '.repeat(8)}$${dinero.format(Math.round(Number(venta.montoPagado)))}`,
      `Cambio:${' '.repeat(padTotal + 2)}$${dinero.format(Math.round(Number(venta.cambio)))}`,
      '================================',
      'Gracias por su compra!',
    ].join('\n');
  }
}
