import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta } from '@cosmeticos/shared-types';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { SesionCaja } from '../caja/entities/sesion-caja.entity';
import { StockSede } from '../inventario/entities/stock-sede.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { ExportarVentasExcelQueryDto } from './dto/exportar-ventas-excel-query.dto';
import { ProductosMasVendidosQueryDto } from './dto/productos-mas-vendidos-query.dto';
import { ReportesQueryDto } from './dto/reportes-query.dto';

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
    private readonly sesionesCajaRepository: Repository<SesionCaja>,
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private toCOP(value: number | string | null | undefined): number {
    if (value == null) {
      return 0;
    }

    return Math.round(Number(value) || 0);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private parseDate(dateStr?: string): Date | undefined {
    if (!dateStr) {
      return undefined;
    }

    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) {
      return undefined;
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private getRange(query: ReportesQueryDto): { inicio: Date; fin: Date } {
    const desde = this.parseDate(query.fechaDesde);
    const hasta = this.parseDate(query.fechaHasta);

    if (desde && hasta) {
      return { inicio: this.startOfDay(desde), fin: this.endOfDay(hasta) };
    }

    if (desde && !hasta) {
      return { inicio: this.startOfDay(desde), fin: this.endOfDay(desde) };
    }

    if (!desde && hasta) {
      return { inicio: this.startOfDay(hasta), fin: this.endOfDay(hasta) };
    }

    const today = new Date();
    return { inicio: this.startOfDay(today), fin: this.endOfDay(today) };
  }

  private getPreviousRange(inicio: Date, fin: Date): { inicio: Date; fin: Date } {
    const lengthMs = fin.getTime() - inicio.getTime() + 1;
    const prevFin = new Date(inicio.getTime() - 1);
    const prevInicio = new Date(prevFin.getTime() - lengthMs + 1);
    return { inicio: prevInicio, fin: prevFin };
  }

  async getVentasResumen(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);
    const prevRange = this.getPreviousRange(inicio, fin);

    const resumenQb = this.ventasRepository
      .createQueryBuilder('venta')
      .select('COUNT(venta.id)', 'totalVentas')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'montoTotal')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA });

    if (query.sedeId) {
      resumenQb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const [actual, anterior, metodos] = await Promise.all([
      resumenQb
        .clone()
        .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
        .getRawOne<{ totalVentas: string; montoTotal: string }>(),
      resumenQb
        .clone()
        .andWhere('venta.createdAt BETWEEN :inicio AND :fin', {
          inicio: prevRange.inicio,
          fin: prevRange.fin,
        })
        .getRawOne<{ montoTotal: string }>(),
      resumenQb
        .clone()
        .select('venta.metodoPago', 'metodoPago')
        .addSelect('COUNT(venta.id)', 'cantidad')
        .addSelect('COALESCE(SUM(venta.total), 0)', 'montoTotal')
        .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
        .groupBy('venta.metodoPago')
        .getRawMany<{ metodoPago: string; cantidad: string; montoTotal: string }>(),
    ]);

    const totalVentas = Number(actual?.totalVentas ?? 0);
    const montoTotal = this.toCOP(actual?.montoTotal);
    const montoAnterior = this.toCOP(anterior?.montoTotal);

    return {
      totalVentas,
      montoTotal,
      ticketPromedio: totalVentas > 0 ? this.toCOP(montoTotal / totalVentas) : 0,
      comparativaPeriodoAnteriorPct:
        montoAnterior > 0
          ? Number((((montoTotal - montoAnterior) / montoAnterior) * 100).toFixed(2))
          : montoTotal > 0
            ? 100
            : 0,
      porMetodoPago: metodos.map((row) => ({
        metodoPago: row.metodoPago,
        cantidad: Number(row.cantidad),
        montoTotal: this.toCOP(row.montoTotal),
      })),
      moneda: 'COP',
      rango: {
        fechaDesde: inicio.toISOString().slice(0, 10),
        fechaHasta: fin.toISOString().slice(0, 10),
      },
    };
  }

  async getVentasPorDia(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.ventasRepository
      .createQueryBuilder('venta')
      .select('DATE(venta.createdAt)', 'fecha')
      .addSelect('COUNT(venta.id)', 'totalVentas')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'montoTotal')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('DATE(venta.createdAt)')
      .orderBy('DATE(venta.createdAt)', 'ASC');

    if (query.sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{ fecha: string; totalVentas: string; montoTotal: string }>();

    return {
      moneda: 'COP',
      serie: rows.map((row) => ({
        fecha: row.fecha,
        totalVentas: Number(row.totalVentas),
        montoTotal: this.toCOP(row.montoTotal),
      })),
    };
  }

  async getVentasPorCajero(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('usuarios', 'cajero', 'cajero.id = venta.cajeroId')
      .select('venta.cajeroId', 'cajeroId')
      .addSelect(
        "TRIM(CONCAT(COALESCE(cajero.nombre, ''), ' ', COALESCE(cajero.apellido, '')))",
        'cajero',
      )
      .addSelect('COUNT(venta.id)', 'ventas')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'montoTotal')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('venta.cajeroId')
      .addGroupBy('cajero.nombre')
      .addGroupBy('cajero.apellido')
      .orderBy('SUM(venta.total)', 'DESC');

    if (query.sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      cajeroId: string;
      cajero: string;
      ventas: string;
      montoTotal: string;
    }>();

    return {
      moneda: 'COP',
      ranking: rows.map((row, index) => ({
        posicion: index + 1,
        cajeroId: row.cajeroId,
        cajero: row.cajero || 'Sin nombre',
        ventas: Number(row.ventas),
        montoTotal: this.toCOP(row.montoTotal),
      })),
    };
  }

  async getVentasPorCategoria(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.detalleVentasRepository
      .createQueryBuilder('detalle')
      .leftJoin('ventas', 'venta', 'venta.id = detalle.ventaId')
      .leftJoin('variantes', 'variante', 'variante.id = detalle.varianteId')
      .leftJoin('productos', 'producto', 'producto.id = variante.productoId')
      .leftJoin('categorias', 'categoria', 'categoria.id = producto.categoriaId')
      .select('categoria.id', 'categoriaId')
      .addSelect("COALESCE(categoria.nombre, 'Sin categoria')", 'categoria')
      .addSelect('COALESCE(SUM(detalle.cantidad), 0)', 'cantidadVendida')
      .addSelect('COALESCE(SUM(detalle.subtotal), 0)', 'montoTotal')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('categoria.id')
      .addGroupBy('categoria.nombre')
      .orderBy('SUM(detalle.subtotal)', 'DESC');

    if (query.sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      categoriaId: string | null;
      categoria: string;
      cantidadVendida: string;
      montoTotal: string;
    }>();

    return {
      moneda: 'COP',
      categorias: rows.map((row) => ({
        categoriaId: row.categoriaId,
        categoria: row.categoria,
        cantidadVendida: Number(row.cantidadVendida),
        montoTotal: this.toCOP(row.montoTotal),
      })),
    };
  }

  async getProductosMasVendidos(query: ProductosMasVendidosQueryDto) {
    const { inicio, fin } = this.getRange(query);
    const top = query.top ?? 10;

    const qb = this.detalleVentasRepository
      .createQueryBuilder('detalle')
      .leftJoin('ventas', 'venta', 'venta.id = detalle.ventaId')
      .leftJoin('variantes', 'variante', 'variante.id = detalle.varianteId')
      .leftJoin('productos', 'producto', 'producto.id = variante.productoId')
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('COALESCE(SUM(detalle.cantidad), 0)', 'cantidadVendida')
      .addSelect('COALESCE(SUM(detalle.subtotal), 0)', 'montoTotal')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .limit(top);

    if (query.sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const [porCantidadRaw, porMontoRaw] = await Promise.all([
      qb.clone().orderBy('SUM(detalle.cantidad)', 'DESC').getRawMany<{
        productoId: string;
        nombre: string;
        cantidadVendida: string;
        montoTotal: string;
      }>(),
      qb.clone().orderBy('SUM(detalle.subtotal)', 'DESC').getRawMany<{
        productoId: string;
        nombre: string;
        cantidadVendida: string;
        montoTotal: string;
      }>(),
    ]);

    const mapRows = (
      rows: { productoId: string; nombre: string; cantidadVendida: string; montoTotal: string }[],
    ) =>
      rows.map((row, index) => ({
        posicion: index + 1,
        productoId: row.productoId,
        nombre: row.nombre,
        cantidadVendida: Number(row.cantidadVendida),
        montoTotal: this.toCOP(row.montoTotal),
      }));

    return {
      top,
      moneda: 'COP',
      porCantidad: mapRows(porCantidadRaw),
      porMonto: mapRows(porMontoRaw),
    };
  }

  async getInventarioValorizado(query: ReportesQueryDto) {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoin('sedes', 'sede', 'sede.id = stock.sedeId')
      .leftJoin('variantes', 'variante', 'variante.id = stock.varianteId')
      .leftJoin('productos', 'producto', 'producto.id = variante.productoId')
      .leftJoin('categorias', 'categoria', 'categoria.id = producto.categoriaId')
      .select('stock.sedeId', 'sedeId')
      .addSelect("COALESCE(sede.nombre, '')", 'sede')
      .addSelect('categoria.id', 'categoriaId')
      .addSelect("COALESCE(categoria.nombre, 'Sin categoria')", 'categoria')
      .addSelect('COUNT(DISTINCT producto.id)', 'productos')
      .addSelect('COALESCE(SUM(stock.cantidad), 0)', 'stockUnidades')
      .addSelect(
        'COALESCE(SUM(stock.cantidad * COALESCE(variante.precioCosto, producto.precio_costo, 0)), 0)',
        'valorInventario',
      )
      .groupBy('stock.sedeId')
      .addGroupBy('sede.nombre')
      .addGroupBy('categoria.id')
      .addGroupBy('categoria.nombre')
      .orderBy(
        'SUM(stock.cantidad * COALESCE(variante.precioCosto, producto.precio_costo, 0))',
        'DESC',
      );

    if (query.sedeId) {
      qb.where('stock.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      sedeId: string;
      sede: string;
      categoriaId: string | null;
      categoria: string;
      productos: string;
      stockUnidades: string;
      valorInventario: string;
    }>();

    return {
      moneda: 'COP',
      items: rows.map((row) => ({
        sedeId: row.sedeId,
        sede: row.sede,
        categoriaId: row.categoriaId,
        categoria: row.categoria,
        productos: Number(row.productos),
        stockUnidades: Number(row.stockUnidades),
        valorInventario: this.toCOP(row.valorInventario),
      })),
    };
  }

  async getInventarioRotacion(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.productosRepository
      .createQueryBuilder('producto')
      .leftJoin('variantes', 'variante', 'variante.productoId = producto.id')
      .leftJoin('stock_sedes', 'stock', 'stock.varianteId = variante.id')
      .leftJoin('detalle_ventas', 'detalle', 'detalle.varianteId = variante.id')
      .leftJoin(
        'ventas',
        'venta',
        'venta.id = detalle.ventaId AND venta.estado = :estadoVenta AND venta.createdAt BETWEEN :inicio AND :fin',
        {
          estadoVenta: EstadoVenta.COMPLETADA,
          inicio,
          fin,
        },
      )
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'producto')
      .addSelect(
        'COALESCE(SUM(CASE WHEN venta.id IS NULL THEN 0 ELSE detalle.cantidad END), 0)',
        'cantidadVendida',
      )
      .addSelect('COALESCE(SUM(stock.cantidad), 0)', 'stockActual')
      .groupBy('producto.id')
      .addGroupBy('producto.nombre');

    if (query.sedeId) {
      qb.andWhere('stock.sedeId = :sedeId', { sedeId: query.sedeId }).andWhere(
        '(venta.id IS NULL OR venta.sedeId = :sedeId)',
        { sedeId: query.sedeId },
      );
    }

    const rows = await qb.getRawMany<{
      productoId: string;
      producto: string;
      cantidadVendida: string;
      stockActual: string;
    }>();

    const items = rows.map((row) => {
      const cantidadVendida = Number(row.cantidadVendida);
      const stockActual = Number(row.stockActual);
      const stockPromedio = (stockActual + cantidadVendida) / 2;
      const rotacion = stockPromedio > 0 ? Number((cantidadVendida / stockPromedio).toFixed(4)) : 0;

      return {
        productoId: row.productoId,
        producto: row.producto,
        cantidadVendida,
        stockPromedio: Math.round(stockPromedio),
        rotacion,
      };
    });

    const ordenados = [...items].sort((a, b) => b.rotacion - a.rotacion);

    return {
      mayorRotacion: ordenados.slice(0, 10),
      menorRotacion: [...ordenados].reverse().slice(0, 10),
    };
  }

  async getInventarioAlertas(query: ReportesQueryDto) {
    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoin('variantes', 'variante', 'variante.id = stock.varianteId')
      .leftJoin('productos', 'producto', 'producto.id = variante.productoId')
      .leftJoin('sedes', 'sede', 'sede.id = stock.sedeId')
      .select('stock.id', 'stockId')
      .addSelect('stock.sedeId', 'sedeId')
      .addSelect('sede.nombre', 'sede')
      .addSelect('producto.id', 'productoId')
      .addSelect('producto.nombre', 'producto')
      .addSelect('variante.id', 'varianteId')
      .addSelect('variante.nombre', 'variante')
      .addSelect('stock.cantidad', 'stockActual')
      .addSelect('stock.stockMinimo', 'stockMinimo')
      .where('stock.cantidad <= stock.stockMinimo')
      .orderBy('(stock.stockMinimo - stock.cantidad)', 'DESC');

    if (query.sedeId) {
      qb.andWhere('stock.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      stockId: string;
      sedeId: string;
      sede: string;
      productoId: string;
      producto: string;
      varianteId: string;
      variante: string;
      stockActual: string;
      stockMinimo: string;
    }>();

    return {
      total: rows.length,
      alertas: rows.map((row) => {
        const stockActual = Number(row.stockActual);
        const stockMinimo = Number(row.stockMinimo);

        return {
          stockId: row.stockId,
          sedeId: row.sedeId,
          sede: row.sede,
          productoId: row.productoId,
          producto: row.producto,
          varianteId: row.varianteId,
          variante: row.variante,
          stockActual,
          stockMinimo,
          deficit: stockMinimo - stockActual,
        };
      }),
    };
  }

  async getClientesNuevos(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.clientesRepository
      .createQueryBuilder('cliente')
      .select('cliente.id', 'clienteId')
      .addSelect('cliente.nombre', 'nombre')
      .addSelect('cliente.apellido', 'apellido')
      .addSelect('cliente.numeroDocumento', 'documento')
      .addSelect('cliente.createdAt', 'fechaRegistro')
      .where('cliente.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('cliente.createdAt', 'DESC');

    if (query.sedeId) {
      qb.andWhere('cliente.sedeRegistroId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      clienteId: string;
      nombre: string;
      apellido: string | null;
      documento: string;
      fechaRegistro: Date;
    }>();

    return {
      total: rows.length,
      clientes: rows.map((row) => ({
        clienteId: row.clienteId,
        nombre: `${row.nombre} ${row.apellido ?? ''}`.trim(),
        documento: row.documento,
        fechaRegistro: row.fechaRegistro,
      })),
    };
  }

  async getClientesFrecuentes(query: ReportesQueryDto) {
    const { inicio, fin } = this.getRange(query);

    const qb = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('clientes', 'cliente', 'cliente.id = venta.clienteId')
      .select('cliente.id', 'clienteId')
      .addSelect('cliente.nombre', 'nombre')
      .addSelect('cliente.apellido', 'apellido')
      .addSelect('cliente.numeroDocumento', 'documento')
      .addSelect('COUNT(venta.id)', 'compras')
      .addSelect('COALESCE(SUM(venta.total), 0)', 'montoTotal')
      .addSelect('MAX(venta.createdAt)', 'ultimaCompra')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .andWhere('venta.clienteId IS NOT NULL')
      .groupBy('cliente.id')
      .addGroupBy('cliente.nombre')
      .addGroupBy('cliente.apellido')
      .addGroupBy('cliente.numeroDocumento')
      .orderBy('COUNT(venta.id)', 'DESC')
      .addOrderBy('SUM(venta.total)', 'DESC')
      .limit(20);

    if (query.sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    const rows = await qb.getRawMany<{
      clienteId: string;
      nombre: string;
      apellido: string | null;
      documento: string;
      compras: string;
      montoTotal: string;
      ultimaCompra: Date;
    }>();

    return {
      moneda: 'COP',
      top: rows.map((row, index) => ({
        posicion: index + 1,
        clienteId: row.clienteId,
        cliente: `${row.nombre} ${row.apellido ?? ''}`.trim(),
        documento: row.documento,
        compras: Number(row.compras),
        montoTotal: this.toCOP(row.montoTotal),
        ultimaCompra: row.ultimaCompra,
      })),
    };
  }

  async getClientesRetencion(query: ReportesQueryDto) {
    const baseDate = this.parseDate(query.fechaHasta) ?? new Date();
    const inicioMesActual = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
    const finMesActual = this.endOfDay(
      new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0),
    );
    const inicioMesAnterior = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    );
    const finMesAnterior = this.endOfDay(new Date(baseDate.getFullYear(), baseDate.getMonth(), 0));

    const [retentionRows, prevTotal, currentTotal] = await Promise.all([
      this.ventasRepository.query(
        `
        SELECT COUNT(*)::int AS retenidos
        FROM (
          SELECT DISTINCT v."clienteId"
          FROM ventas v
          WHERE v.estado = $1
            AND v."clienteId" IS NOT NULL
            AND v."createdAt" BETWEEN $2 AND $3
            ${query.sedeId ? 'AND v."sedeId" = $6' : ''}
        ) mes_anterior
        INNER JOIN (
          SELECT DISTINCT v."clienteId"
          FROM ventas v
          WHERE v.estado = $1
            AND v."clienteId" IS NOT NULL
            AND v."createdAt" BETWEEN $4 AND $5
            ${query.sedeId ? 'AND v."sedeId" = $6' : ''}
        ) mes_actual ON mes_actual."clienteId" = mes_anterior."clienteId"
        `,
        query.sedeId
          ? [
              EstadoVenta.COMPLETADA,
              inicioMesAnterior,
              finMesAnterior,
              inicioMesActual,
              finMesActual,
              query.sedeId,
            ]
          : [
              EstadoVenta.COMPLETADA,
              inicioMesAnterior,
              finMesAnterior,
              inicioMesActual,
              finMesActual,
            ],
      ),
      this.ventasRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.clienteId)', 'total')
        .where('v.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
        .andWhere('v.clienteId IS NOT NULL')
        .andWhere('v.createdAt BETWEEN :inicio AND :fin', {
          inicio: inicioMesAnterior,
          fin: finMesAnterior,
        })
        .andWhere(
          query.sedeId ? 'v.sedeId = :sedeId' : '1=1',
          query.sedeId ? { sedeId: query.sedeId } : {},
        )
        .getRawOne<{ total: string }>(),
      this.ventasRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.clienteId)', 'total')
        .where('v.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
        .andWhere('v.clienteId IS NOT NULL')
        .andWhere('v.createdAt BETWEEN :inicio AND :fin', {
          inicio: inicioMesActual,
          fin: finMesActual,
        })
        .andWhere(
          query.sedeId ? 'v.sedeId = :sedeId' : '1=1',
          query.sedeId ? { sedeId: query.sedeId } : {},
        )
        .getRawOne<{ total: string }>(),
    ]);

    const retenidos = Number(retentionRows?.[0]?.retenidos ?? 0);
    const totalMesAnterior = Number(prevTotal?.total ?? 0);
    const totalMesActual = Number(currentTotal?.total ?? 0);

    return {
      retenidos,
      totalMesAnterior,
      totalMesActual,
      tasaRetencion:
        totalMesAnterior > 0 ? Number(((retenidos / totalMesAnterior) * 100).toFixed(2)) : 0,
      rango: {
        mesAnterior: {
          desde: inicioMesAnterior.toISOString().slice(0, 10),
          hasta: finMesAnterior.toISOString().slice(0, 10),
        },
        mesActual: {
          desde: inicioMesActual.toISOString().slice(0, 10),
          hasta: finMesActual.toISOString().slice(0, 10),
        },
      },
    };
  }

  async getDashboard(query: ReportesQueryDto) {
    const today = new Date();
    const inicioDia = this.startOfDay(today);
    const finDia = this.endOfDay(today);
    const inicioSemana = this.startOfDay(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    );
    const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);

    const cacheKey = `reportes:dashboard:${query.sedeId ?? 'all'}:${inicioDia.toISOString().slice(0, 10)}`;
    const cached = await this.cacheManager.get<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const ventasBase = this.ventasRepository
      .createQueryBuilder('venta')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA });

    if (query.sedeId) {
      ventasBase.andWhere('venta."sedeId" = :sedeId', { sedeId: query.sedeId });
    }

    const [hoy, semana, mes, alertasStock, cajaAbierta, topProductosDia, ultimaVenta] =
      await Promise.all([
        ventasBase
          .clone()
          .select('COUNT(venta.id)', 'cantidad')
          .addSelect('COALESCE(SUM(venta.total), 0)', 'monto')
          .andWhere('venta."createdAt" BETWEEN :inicioDia AND :finDia', { inicioDia, finDia })
          .getRawOne<{ cantidad: string; monto: string }>(),
        ventasBase
          .clone()
          .select('COUNT(venta.id)', 'cantidad')
          .addSelect('COALESCE(SUM(venta.total), 0)', 'monto')
          .andWhere('venta."createdAt" BETWEEN :inicioSemana AND :finDia', {
            inicioSemana,
            finDia,
          })
          .getRawOne<{ cantidad: string; monto: string }>(),
        ventasBase
          .clone()
          .select('COUNT(venta.id)', 'cantidad')
          .addSelect('COALESCE(SUM(venta.total), 0)', 'monto')
          .andWhere('venta."createdAt" BETWEEN :inicioMes AND :finDia', { inicioMes, finDia })
          .getRawOne<{ cantidad: string; monto: string }>(),
        this.stockRepository
          .createQueryBuilder('stock')
          .select('COUNT(stock.id)', 'total')
          .where('stock.cantidad <= stock.stock_minimo')
          .andWhere(
            query.sedeId ? 'stock."sedeId" = :sedeId' : '1=1',
            query.sedeId ? { sedeId: query.sedeId } : {},
          )
          .getRawOne<{ total: string }>(),
        this.sesionesCajaRepository
          .createQueryBuilder('sesion')
          .leftJoin('cajas', 'caja', 'caja.id = sesion."cajaId"')
          .select('COUNT(sesion.id) > 0', 'abierta')
          .where('sesion.activa = true')
          .andWhere(
            query.sedeId ? 'caja."sedeId" = :sedeId' : '1=1',
            query.sedeId ? { sedeId: query.sedeId } : {},
          )
          .getRawOne<{ abierta: boolean | string }>(),
        this.detalleVentasRepository
          .createQueryBuilder('detalle')
          .leftJoin('detalle.venta', 'venta')
          .leftJoin('detalle.variante', 'variante')
          .leftJoin('variante.producto', 'producto')
          .select('producto.id', 'productoId')
          .addSelect('producto.nombre', 'producto')
          .addSelect('COALESCE(SUM(detalle.cantidad), 0)', 'cantidad')
          .addSelect('COALESCE(SUM(detalle.subtotal), 0)', 'monto')
          .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
          .andWhere('venta."createdAt" BETWEEN :inicioDia AND :finDia', { inicioDia, finDia })
          .andWhere(
            query.sedeId ? 'venta."sedeId" = :sedeId' : '1=1',
            query.sedeId ? { sedeId: query.sedeId } : {},
          )
          .groupBy('producto.id')
          .addGroupBy('producto.nombre')
          .orderBy('SUM(detalle.cantidad)', 'DESC')
          .limit(5)
          .getRawMany<{ productoId: string; producto: string; cantidad: string; monto: string }>(),
        (async () => {
          const qb = this.ventasRepository
            .createQueryBuilder('venta')
            .leftJoinAndSelect('venta.cajero', 'cajero')
            .leftJoinAndSelect('venta.cliente', 'cliente')
            .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA });

          if (query.sedeId) {
            qb.andWhere('venta."sedeId" = :sedeId', { sedeId: query.sedeId });
          }

          return qb.orderBy('venta."createdAt"', 'DESC').getOne();
        })(),
      ]);

    const response = {
      moneda: 'COP',
      ventasHoy: {
        cantidad: Number(hoy?.cantidad ?? 0),
        monto: this.toCOP(hoy?.monto),
      },
      ventasSemana: {
        cantidad: Number(semana?.cantidad ?? 0),
        monto: this.toCOP(semana?.monto),
      },
      ventasMes: {
        cantidad: Number(mes?.cantidad ?? 0),
        monto: this.toCOP(mes?.monto),
      },
      alertasStock: Number(alertasStock?.total ?? 0),
      cajaAbierta:
        cajaAbierta?.abierta === true ||
        cajaAbierta?.abierta === 'true' ||
        cajaAbierta?.abierta === 't',
      top5ProductosDelDia: topProductosDia.map((row, index) => ({
        posicion: index + 1,
        productoId: row.productoId,
        producto: row.producto,
        cantidad: Number(row.cantidad),
        monto: this.toCOP(row.monto),
      })),
      ultimaVenta: ultimaVenta
        ? {
            ventaId: ultimaVenta.id,
            numero: ultimaVenta.numero,
            fecha: ultimaVenta.createdAt,
            total: this.toCOP(ultimaVenta.total),
            metodoPago: ultimaVenta.metodoPago,
            cajero: ultimaVenta.cajero
              ? `${ultimaVenta.cajero.nombre} ${ultimaVenta.cajero.apellido ?? ''}`.trim()
              : null,
            cliente: ultimaVenta.cliente
              ? `${ultimaVenta.cliente.nombre} ${ultimaVenta.cliente.apellido ?? ''}`.trim()
              : null,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, response, 60_000);
    return response;
  }

  async exportarVentasExcel(
    query: ExportarVentasExcelQueryDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const inicio = new Date(query.ano, query.mes - 1, 1, 0, 0, 0, 0);
    const fin = this.endOfDay(new Date(query.ano, query.mes, 0));

    const rows = await this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('usuarios', 'cajero', 'cajero.id = venta.cajeroId')
      .leftJoin('clientes', 'cliente', 'cliente.id = venta.clienteId')
      .leftJoin('detalle_ventas', 'detalle', 'detalle.ventaId = venta.id')
      .leftJoin('variantes', 'variante', 'variante.id = detalle.varianteId')
      .leftJoin('productos', 'producto', 'producto.id = variante.productoId')
      .select('DATE(venta.createdAt)', 'fecha')
      .addSelect('venta.numero', 'numero')
      .addSelect(
        "TRIM(CONCAT(COALESCE(cajero.nombre, ''), ' ', COALESCE(cajero.apellido, '')))",
        'cajero',
      )
      .addSelect(
        "TRIM(CONCAT(COALESCE(cliente.nombre, ''), ' ', COALESCE(cliente.apellido, '')))",
        'cliente',
      )
      .addSelect(
        `COALESCE(STRING_AGG(CONCAT(COALESCE(producto.nombre, variante.nombre, detalle.varianteId), ' x', detalle.cantidad), ', ' ORDER BY COALESCE(producto.nombre, variante.nombre, detalle.varianteId)), '')`,
        'productos',
      )
      .addSelect('venta.subtotal', 'subtotal')
      .addSelect('venta.impuestos', 'iva')
      .addSelect('venta.total', 'total')
      .addSelect('venta.metodoPago', 'metodoPago')
      .where('venta.estado = :estadoVenta', { estadoVenta: EstadoVenta.COMPLETADA })
      .andWhere('venta.createdAt BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('venta.id')
      .addGroupBy('cajero.nombre')
      .addGroupBy('cajero.apellido')
      .addGroupBy('cliente.nombre')
      .addGroupBy('cliente.apellido')
      .orderBy('venta.createdAt', 'ASC')
      .getRawMany<{
        fecha: string;
        numero: string;
        cajero: string;
        cliente: string;
        productos: string;
        subtotal: string;
        iva: string;
        total: string;
        metodoPago: string;
      }>();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ventas');

    worksheet.columns = [
      { header: 'fecha', key: 'fecha', width: 14 },
      { header: 'numero', key: 'numero', width: 20 },
      { header: 'cajero', key: 'cajero', width: 24 },
      { header: 'cliente', key: 'cliente', width: 24 },
      { header: 'productos', key: 'productos', width: 60 },
      { header: 'subtotal', key: 'subtotal', width: 14 },
      { header: 'IVA', key: 'iva', width: 14 },
      { header: 'total', key: 'total', width: 14 },
      { header: 'metodoPago', key: 'metodoPago', width: 20 },
    ];

    for (const row of rows) {
      worksheet.addRow({
        fecha: row.fecha,
        numero: row.numero,
        cajero: row.cajero || '',
        cliente: row.cliente || '',
        productos: row.productos || '',
        subtotal: this.toCOP(row.subtotal),
        iva: this.toCOP(row.iva),
        total: this.toCOP(row.total),
        metodoPago: row.metodoPago,
      });
    }

    worksheet.getRow(1).font = { bold: true };

    const content = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const filename = `ventas-${query.ano}-${String(query.mes).padStart(2, '0')}.xlsx`;

    return { buffer, filename };
  }
}
