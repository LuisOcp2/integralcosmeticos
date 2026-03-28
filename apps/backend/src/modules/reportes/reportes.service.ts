import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EstadoVenta,
  IClienteFrecuente,
  IMargenProducto,
  IProductoMasVendido,
  IResumenCierreCaja,
  IResumenVentasDia,
  IStockReporte,
  IVentasPorSede,
} from '@cosmeticos/shared-types';
import { Repository } from 'typeorm';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
import { Caja } from '../caja/entities/caja.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { StockSede } from '../inventario/entities/stock-sede.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { Cliente } from '../clientes/entities/cliente.entity';

type DesgloseMetodoRaw = {
  metodoPago: string;
  total: string;
  cantidad: string;
};

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detalleVentasRepository: Repository<DetalleVenta>,
    @InjectRepository(StockSede)
    private readonly stockRepository: Repository<StockSede>,
    @InjectRepository(SesionCaja)
    private readonly cajaRepository: Repository<SesionCaja>,
  ) {}

  private getDayRange(fecha: string): { inicio: Date; fin: Date } {
    const [year, month, day] = fecha.split('-').map(Number);
    const inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
    const fin = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { inicio, fin };
  }

  private getDateRange(fechaInicio: string, fechaFin: string): { inicio: Date; fin: Date } {
    const inicio = this.getDayRange(fechaInicio).inicio;
    const fin = this.getDayRange(fechaFin).fin;
    return { inicio, fin };
  }

  async ventasDelDia(sedeId: string, fecha: string): Promise<IResumenVentasDia> {
    const { inicio, fin } = this.getDayRange(fecha);
    const fechaAnterior = new Date(inicio);
    fechaAnterior.setDate(fechaAnterior.getDate() - 1);
    const fechaAnteriorISO = `${fechaAnterior.getFullYear()}-${String(fechaAnterior.getMonth() + 1).padStart(2, '0')}-${String(fechaAnterior.getDate()).padStart(2, '0')}`;
    const { inicio: inicioAnterior, fin: finAnterior } = this.getDayRange(fechaAnteriorISO);

    const resumenRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('COALESCE(SUM(venta.total), 0)', 'totalVentas')
      .addSelect('COUNT(venta.id)', 'cantidadTransacciones')
      .where('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .getRawOne<{ totalVentas: string; cantidadTransacciones: string }>();

    const anteriorRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('COALESCE(SUM(venta.total), 0)', 'totalVentas')
      .where('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', {
        inicio: inicioAnterior,
        fin: finAnterior,
      })
      .getRawOne<{ totalVentas: string }>();

    const desgloseRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('venta.metodoPago', 'metodoPago')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'total')
      .addSelect('COUNT(venta.id)', 'cantidad')
      .where('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('venta.metodoPago')
      .getRawMany<DesgloseMetodoRaw>();

    const totalVentas = Number(resumenRaw?.totalVentas ?? 0);
    const cantidadTransacciones = Number(resumenRaw?.cantidadTransacciones ?? 0);
    const totalAnterior = Number(anteriorRaw?.totalVentas ?? 0);
    const promedioTicket = cantidadTransacciones > 0 ? totalVentas / cantidadTransacciones : 0;

    const comparativoDiaAnterior =
      totalAnterior === 0
        ? totalVentas > 0
          ? 100
          : 0
        : ((totalVentas - totalAnterior) / totalAnterior) * 100;

    return {
      totalVentas,
      cantidadTransacciones,
      promedioTicket,
      comparativoDiaAnterior,
      desglosePorMetodoPago: desgloseRaw.map((item) => ({
        metodoPago: item.metodoPago,
        total: Number(item.total),
        cantidadTransacciones: Number(item.cantidad),
      })),
    };
  }

  async ventasPorSede(fechaInicio: string, fechaFin: string): Promise<IVentasPorSede[]> {
    const { inicio, fin } = this.getDateRange(fechaInicio, fechaFin);

    const rows = await this.ventasRepository
      .createQueryBuilder('venta')
      .innerJoin(Sede, 'sede', 'sede.id = venta.sedeId AND sede.activo = true')
      .select('venta.sedeId', 'sedeId')
      .addSelect('sede.nombre', 'nombreSede')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'totalVentas')
      .addSelect('COUNT(venta.id)', 'cantidadTransacciones')
      .where('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('venta.sedeId')
      .addGroupBy('sede.nombre')
      .orderBy('SUM(venta.total)', 'DESC')
      .getRawMany<{
        sedeId: string;
        nombreSede: string;
        totalVentas: string;
        cantidadTransacciones: string;
      }>();

    return rows.map((row) => ({
      sedeId: row.sedeId,
      nombreSede: row.nombreSede,
      totalVentas: Number(row.totalVentas),
      cantidadTransacciones: Number(row.cantidadTransacciones),
    }));
  }

  async productosMasVendidos(
    sedeId: string,
    fechaInicio: string,
    fechaFin: string,
    limit = 10,
  ): Promise<IProductoMasVendido[]> {
    const { inicio, fin } = this.getDateRange(fechaInicio, fechaFin);

    const rows = await this.detalleVentasRepository
      .createQueryBuilder('detalle')
      .innerJoin(Venta, 'venta', 'venta.id = detalle.ventaId')
      .innerJoin(
        Variante,
        'variante',
        'variante.id = detalle.varianteId AND variante.activa = true',
      )
      .innerJoin(
        Producto,
        'producto',
        'producto.id = variante.productoId AND producto.activo = true',
      )
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('COALESCE(SUM(detalle.cantidad), 0)', 'totalUnidades')
      .addSelect('COALESCE(SUM(detalle.subtotal), 0)', 'totalRevenue')
      .where('1=1')
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .orderBy('SUM(detalle.cantidad)', 'DESC')
      .limit(limit)
      .getRawMany<{
        productoId: string;
        nombre: string;
        totalUnidades: string;
        totalRevenue: string;
      }>();

    return rows.map((row) => ({
      productoId: row.productoId,
      nombre: row.nombre,
      totalUnidades: Number(row.totalUnidades),
      totalRevenue: Number(row.totalRevenue),
    }));
  }

  async margenPorProducto(
    sedeId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<IMargenProducto[]> {
    const { inicio, fin } = this.getDateRange(fechaInicio, fechaFin);

    const rows = await this.detalleVentasRepository
      .createQueryBuilder('detalle')
      .innerJoin(Venta, 'venta', 'venta.id = detalle.ventaId')
      .innerJoin(
        Variante,
        'variante',
        'variante.id = detalle.varianteId AND variante.activa = true',
      )
      .innerJoin(
        Producto,
        'producto',
        'producto.id = variante.productoId AND producto.activo = true',
      )
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('COALESCE(SUM(detalle.cantidad * producto.precioCosto), 0)', 'costoTotal')
      .addSelect('COALESCE(SUM(detalle.precioUnitario * detalle.cantidad), 0)', 'revenueTotal')
      .where('1=1')
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .orderBy('SUM(detalle.precioUnitario * detalle.cantidad)', 'DESC')
      .getRawMany<{
        productoId: string;
        nombre: string;
        costoTotal: string;
        revenueTotal: string;
      }>();

    return rows.map((row) => {
      const costoTotal = Number(row.costoTotal);
      const revenueTotal = Number(row.revenueTotal);
      const margenPorcentaje =
        revenueTotal > 0 ? ((revenueTotal - costoTotal) / revenueTotal) * 100 : 0;

      return {
        productoId: row.productoId,
        nombre: row.nombre,
        costoTotal,
        revenueTotal,
        margenPorcentaje,
      };
    });
  }

  async stockActualPorSede(sedeId: string): Promise<IStockReporte[]> {
    const rows = await this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin(Variante, 'variante', 'variante.id = stock.varianteId AND variante.activa = true')
      .innerJoin(
        Producto,
        'producto',
        'producto.id = variante.productoId AND producto.activo = true',
      )
      .select('stock.varianteId', 'varianteId')
      .addSelect('variante.nombre', 'nombreVariante')
      .addSelect('producto.nombre', 'nombreProducto')
      .addSelect('stock.sedeId', 'sedeId')
      .addSelect('stock.cantidad', 'cantidad')
      .addSelect('stock.stockMinimo', 'stockMinimo')
      .where('stock.sedeId = :sedeId', { sedeId })
      .orderBy('stock.cantidad', 'ASC')
      .getRawMany<{
        varianteId: string;
        nombreVariante: string;
        nombreProducto: string;
        sedeId: string;
        cantidad: string;
        stockMinimo: string;
      }>();

    return rows.map((row) => {
      const cantidad = Number(row.cantidad);
      const stockMinimo = Number(row.stockMinimo);
      return {
        varianteId: row.varianteId,
        nombreVariante: row.nombreVariante,
        nombreProducto: row.nombreProducto,
        sedeId: row.sedeId,
        cantidad,
        stockMinimo,
        alerta: cantidad < stockMinimo,
      };
    });
  }

  async productosBajoMinimo(sedeId: string): Promise<IStockReporte[]> {
    const rows = await this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin(Variante, 'variante', 'variante.id = stock.varianteId AND variante.activa = true')
      .innerJoin(
        Producto,
        'producto',
        'producto.id = variante.productoId AND producto.activo = true',
      )
      .select('stock.varianteId', 'varianteId')
      .addSelect('variante.nombre', 'nombreVariante')
      .addSelect('producto.nombre', 'nombreProducto')
      .addSelect('stock.sedeId', 'sedeId')
      .addSelect('stock.cantidad', 'cantidad')
      .addSelect('stock.stockMinimo', 'stockMinimo')
      .where('stock.sedeId = :sedeId', { sedeId })
      .andWhere('stock.cantidad <= stock.stockMinimo')
      .orderBy('(stock.stockMinimo - stock.cantidad)', 'DESC')
      .getRawMany<{
        varianteId: string;
        nombreVariante: string;
        nombreProducto: string;
        sedeId: string;
        cantidad: string;
        stockMinimo: string;
      }>();

    return rows.map((row) => ({
      varianteId: row.varianteId,
      nombreVariante: row.nombreVariante,
      nombreProducto: row.nombreProducto,
      sedeId: row.sedeId,
      cantidad: Number(row.cantidad),
      stockMinimo: Number(row.stockMinimo),
      alerta: true,
    }));
  }

  async clientesFrecuentes(
    sedeId: string,
    fechaInicio: string,
    fechaFin: string,
    limit = 10,
  ): Promise<IClienteFrecuente[]> {
    const { inicio, fin } = this.getDateRange(fechaInicio, fechaFin);

    const rows = await this.ventasRepository
      .createQueryBuilder('venta')
      .innerJoin(Cliente, 'cliente', 'cliente.id = venta.clienteId AND cliente.activo = true')
      .select('cliente.id', 'clienteId')
      .addSelect('cliente.nombre', 'nombre')
      .addSelect('cliente.apellido', 'apellido')
      .addSelect('cliente.documento', 'documento')
      .addSelect('cliente.puntosFidelidad', 'puntosAcumulados')
      .addSelect('COUNT(venta.id)', 'totalCompras')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'totalGastado')
      .where('venta.sedeId = :sedeId', { sedeId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .andWhere('venta.clienteId IS NOT NULL')
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('cliente.id')
      .addGroupBy('cliente.nombre')
      .addGroupBy('cliente.apellido')
      .addGroupBy('cliente.documento')
      .addGroupBy('cliente.puntosFidelidad')
      .orderBy('COUNT(venta.id)', 'DESC')
      .addOrderBy('SUM(venta.total)', 'DESC')
      .limit(limit)
      .getRawMany<{
        clienteId: string;
        nombre: string;
        apellido: string;
        documento: string;
        puntosAcumulados: string;
        totalCompras: string;
        totalGastado: string;
      }>();

    return rows.map((row) => ({
      clienteId: row.clienteId,
      nombre: `${row.nombre} ${row.apellido}`,
      documento: row.documento,
      totalCompras: Number(row.totalCompras),
      totalGastado: Number(row.totalGastado),
      puntosAcumulados: Number(row.puntosAcumulados),
    }));
  }

  async cierreCajaDiario(sedeId: string, fecha: string): Promise<IResumenCierreCaja | null> {
    const { inicio, fin } = this.getDayRange(fecha);

    const row = await this.cajaRepository
      .createQueryBuilder('caja')
      .innerJoin(Caja, 'cajaFisica', 'cajaFisica.id = caja.cajaId')
      .leftJoin(Usuario, 'usuario', 'usuario.id = caja.usuarioAperturaId AND usuario.activo = true')
      .select('caja.id', 'cajaId')
      .addSelect('caja.montoInicial', 'montoInicial')
      .addSelect('caja.montoFinal', 'montoFinal')
      .addSelect('caja.totalVentas', 'totalVentas')
      .addSelect(
        "COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.\"sesionCajaId\" = caja.id AND v.metodo_pago = 'EFECTIVO' AND v.estado = 'COMPLETADA'), 0)",
        'totalEfectivo',
      )
      .addSelect('COALESCE(caja.diferencia, 0)', 'diferencia')
      .addSelect('caja.fechaCierre', 'fechaCierre')
      .addSelect('caja.fechaApertura', 'fechaApertura')
      .addSelect('usuario.nombre', 'nombreUsuario')
      .addSelect('usuario.apellido', 'apellidoUsuario')
      .where('cajaFisica.sedeId = :sedeId', { sedeId })
      .andWhere('caja.fechaApertura BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('caja.fechaApertura', 'DESC')
      .getRawOne<{
        cajaId: string;
        montoInicial: string;
        montoFinal: string;
        totalVentas: string;
        totalEfectivo: string;
        diferencia: string;
        fechaCierre: Date | null;
        fechaApertura: Date;
        nombreUsuario: string | null;
        apellidoUsuario: string | null;
      }>();

    if (!row) {
      return null;
    }

    return {
      cajaId: row.cajaId,
      montoInicial: Number(row.montoInicial),
      montoFinal: Number(row.montoFinal ?? 0),
      totalVentas: Number(row.totalVentas),
      totalEfectivo: Number(row.totalEfectivo),
      diferencia: Number(row.diferencia),
      usuario:
        row.nombreUsuario && row.apellidoUsuario
          ? `${row.nombreUsuario} ${row.apellidoUsuario}`
          : 'Sin usuario',
      fecha: (row.fechaCierre ?? row.fechaApertura) as Date,
    };
  }
}
