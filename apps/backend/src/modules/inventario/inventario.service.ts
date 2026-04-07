import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Producto } from '../catalogo/productos/entities/producto.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { TriggerWorkflowTipo } from '../workflows/entities/workflow.entity';
import { AjustarStockDto } from './dto/ajustar-stock.dto';
import { FiltrosMovimientoDto } from './dto/filtros-movimiento.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { TrasladarStockDto } from './dto/trasladar-stock.dto';
import { AlertaStock, TipoAlertaStock } from './entities/alerta-stock.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { StockSede } from './entities/stock-sede.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(StockSede)
    private readonly stockRepository: Repository<StockSede>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
    @InjectRepository(AlertaStock)
    private readonly alertaRepository: Repository<AlertaStock>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  private async validarSedeActiva(sedeId: string): Promise<void> {
    const sede = await this.sedesRepository.findOne({ where: { id: sedeId, activo: true } });
    if (!sede) {
      throw new NotFoundException('Sede no encontrada o inactiva');
    }
  }

  private async validarVarianteActiva(varianteId: string): Promise<void> {
    const variante = await this.variantesRepository.findOne({
      where: { id: varianteId, activo: true },
      relations: ['producto'],
    });
    if (!variante || !variante.producto || !variante.producto.activo) {
      throw new NotFoundException('Variante no encontrada');
    }
  }

  private validarTipoSoportado(tipo: TipoMovimiento): void {
    if (tipo === TipoMovimiento.TRASLADO) {
      throw new BadRequestException('Use el endpoint de traslado para movimientos TRASLADO');
    }
  }

  private resolverSedeObjetivo(dto: RegistrarMovimientoDto): string {
    if (dto.tipo === TipoMovimiento.ENTRADA) {
      const sede = dto.sedeDestinoId ?? dto.sedeOrigenId;
      if (!sede) {
        throw new BadRequestException('Debe enviar sedeDestinoId o sedeOrigenId para ENTRADA');
      }
      return sede;
    }

    const sede = dto.sedeOrigenId ?? dto.sedeDestinoId;
    if (!sede) {
      throw new BadRequestException('Debe enviar sedeOrigenId para la operacion');
    }
    return sede;
  }

  private async verificarYCrearAlertaStock(
    manager: EntityManager,
    stock: StockSede,
    realizadoPorId: string,
  ): Promise<void> {
    const alertaRepo = manager.getRepository(AlertaStock);

    let tipoAlerta: TipoAlertaStock | null = null;
    if (stock.cantidad <= 0) {
      tipoAlerta = TipoAlertaStock.SIN_STOCK;
    } else if (stock.stockMaximo != null && stock.cantidad > stock.stockMaximo) {
      tipoAlerta = TipoAlertaStock.SOBRE_MAXIMO;
    } else if (stock.cantidad < stock.stockMinimo) {
      tipoAlerta = TipoAlertaStock.BAJO_MINIMO;
    }

    if (!tipoAlerta) {
      return;
    }

    const existente = await alertaRepo.findOne({
      where: {
        varianteId: stock.varianteId,
        sedeId: stock.sedeId,
        tipo: tipoAlerta,
        atendida: false,
      },
    });

    if (existente) {
      existente.cantidad = stock.cantidad;
      await alertaRepo.save(existente);
      return;
    }

    await alertaRepo.save(
      alertaRepo.create({
        varianteId: stock.varianteId,
        sedeId: stock.sedeId,
        tipo: tipoAlerta,
        cantidad: stock.cantidad,
        atendida: false,
        atendidaPorId: null,
        atendidaEn: null,
      }),
    );

    if (tipoAlerta === TipoAlertaStock.BAJO_MINIMO) {
      await this.workflowEngine.dispararEvento(TriggerWorkflowTipo.STOCK_BAJO_MINIMO, {
        varianteId: stock.varianteId,
        sedeId: stock.sedeId,
        cantidad: stock.cantidad,
      });
    }

    const alertasActivas = await alertaRepo.find({
      where: {
        varianteId: stock.varianteId,
        sedeId: stock.sedeId,
        atendida: false,
      },
    });

    for (const alerta of alertasActivas) {
      if (alerta.tipo !== tipoAlerta) {
        alerta.atendida = true;
        alerta.atendidaEn = new Date();
        alerta.atendidaPorId = realizadoPorId;
      }
    }

    if (alertasActivas.some((a) => a.atendida)) {
      await alertaRepo.save(alertasActivas);
    }
  }

  async registrarMovimiento(dto: RegistrarMovimientoDto, realizadoPorId: string) {
    this.validarTipoSoportado(dto.tipo);
    await this.validarVarianteActiva(dto.varianteId);

    const sedeObjetivo = this.resolverSedeObjetivo(dto);
    await this.validarSedeActiva(sedeObjetivo);

    if (dto.sedeOrigenId) {
      await this.validarSedeActiva(dto.sedeOrigenId);
    }
    if (dto.sedeDestinoId) {
      await this.validarSedeActiva(dto.sedeDestinoId);
    }

    return this.dataSource.transaction((manager) =>
      this.registrarMovimientoConManager(dto, realizadoPorId, manager),
    );
  }

  async registrarMovimientoConManager(
    dto: RegistrarMovimientoDto,
    realizadoPorId: string,
    manager: EntityManager,
  ) {
    this.validarTipoSoportado(dto.tipo);

    const stockRepo = manager.getRepository(StockSede);
    const movimientoRepo = manager.getRepository(MovimientoInventario);

    const sedeObjetivo = this.resolverSedeObjetivo(dto);

    let stock = await stockRepo.findOne({
      where: { varianteId: dto.varianteId, sedeId: sedeObjetivo },
    });

    if (!stock) {
      stock = stockRepo.create({
        varianteId: dto.varianteId,
        sedeId: sedeObjetivo,
        cantidad: 0,
        stockMinimo: 0,
        stockMaximo: null,
      });
    }

    const cantidadAnterior = stock.cantidad;

    if (dto.tipo === TipoMovimiento.AJUSTE) {
      const cantidadAjuste = Number(dto.cantidad);
      const siguiente = stock.cantidad + cantidadAjuste;
      if (siguiente < 0) {
        throw new BadRequestException('El ajuste no puede dejar stock negativo');
      }
      stock.cantidad = siguiente;
    } else {
      const suma = [TipoMovimiento.ENTRADA, TipoMovimiento.DEVOLUCION].includes(dto.tipo);

      if (suma) {
        stock.cantidad += dto.cantidad;
      } else {
        if (stock.cantidad < dto.cantidad) {
          throw new BadRequestException('Stock insuficiente para la operacion');
        }
        stock.cantidad -= dto.cantidad;
      }
    }

    const stockGuardado = await stockRepo.save(stock);

    const movimiento = movimientoRepo.create({
      tipo: dto.tipo,
      varianteId: dto.varianteId,
      sedeOrigenId: dto.sedeOrigenId ?? null,
      sedeDestinoId: dto.sedeDestinoId ?? null,
      cantidad: dto.tipo === TipoMovimiento.AJUSTE ? Math.abs(dto.cantidad) : dto.cantidad,
      cantidadAnterior,
      cantidadNueva: stockGuardado.cantidad,
      motivo: dto.motivo ?? null,
      referencia: dto.referencia ?? null,
      realizadoPorId,
    });

    const movimientoGuardado = await movimientoRepo.save(movimiento);
    await this.verificarYCrearAlertaStock(manager, stockGuardado, realizadoPorId);

    return {
      movimiento: movimientoGuardado,
      stock: stockGuardado,
    };
  }

  async ajustar(dto: AjustarStockDto, realizadoPorId: string) {
    await this.validarVarianteActiva(dto.varianteId);
    await this.validarSedeActiva(dto.sedeId);

    return this.dataSource.transaction(async (manager) => {
      const stock = await manager.getRepository(StockSede).findOne({
        where: { varianteId: dto.varianteId, sedeId: dto.sedeId },
      });

      const actual = stock?.cantidad ?? 0;

      let diferencia = 0;
      if (dto.cantidadNueva !== undefined) {
        diferencia = dto.cantidadNueva - actual;
      } else if (dto.cantidad !== undefined) {
        const base = Math.abs(Number(dto.cantidad));
        const esMerma = dto.motivo?.toUpperCase() === 'MERMA';
        diferencia = esMerma ? -base : base;
      } else {
        throw new BadRequestException('Debe enviar cantidadNueva o cantidad para ajustar stock');
      }

      if (diferencia === 0) {
        throw new BadRequestException('La cantidad nueva es igual al stock actual');
      }

      return this.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.AJUSTE,
          varianteId: dto.varianteId,
          sedeOrigenId: dto.sedeId,
          cantidad: diferencia,
          motivo: dto.motivo,
          referencia: dto.referencia ?? dto.nota,
        },
        realizadoPorId,
        manager,
      );
    });
  }

  async trasladar(dto: TrasladarStockDto, realizadoPorId: string) {
    if (dto.sedeOrigenId === dto.sedeDestinoId) {
      throw new BadRequestException('La sede origen y destino deben ser diferentes');
    }

    await this.validarVarianteActiva(dto.varianteId);
    await this.validarSedeActiva(dto.sedeOrigenId);
    await this.validarSedeActiva(dto.sedeDestinoId);

    return this.dataSource.transaction(async (manager) => {
      const salida = await this.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.SALIDA,
          varianteId: dto.varianteId,
          sedeOrigenId: dto.sedeOrigenId,
          sedeDestinoId: dto.sedeDestinoId,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          referencia: dto.referencia,
        },
        realizadoPorId,
        manager,
      );

      const entrada = await this.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.ENTRADA,
          varianteId: dto.varianteId,
          sedeOrigenId: dto.sedeOrigenId,
          sedeDestinoId: dto.sedeDestinoId,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          referencia: dto.referencia,
        },
        realizadoPorId,
        manager,
      );

      return {
        salida: salida.movimiento,
        entrada: entrada.movimiento,
        stockOrigen: salida.stock,
        stockDestino: entrada.stock,
      };
    });
  }

  async getStockPorSede(sedeId: string) {
    await this.validarSedeActiva(sedeId);

    const rows = await this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin(Variante, 'variante', 'variante.id = stock.varianteId')
      .innerJoin(Producto, 'producto', 'producto.id = variante.productoId')
      .leftJoin('categorias', 'categoria', 'categoria.id = producto.categoriaId')
      .select('stock.id', 'id')
      .addSelect('stock.varianteId', 'varianteId')
      .addSelect('stock.sedeId', 'sedeId')
      .addSelect('stock.cantidad', 'cantidad')
      .addSelect('stock.stockMinimo', 'stockMinimo')
      .addSelect('stock.stockMaximo', 'stockMaximo')
      .addSelect('variante.nombre', 'nombreVariante')
      .addSelect('variante.sku', 'skuVariante')
      .addSelect('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombreProducto')
      .addSelect('categoria.nombre', 'categoriaNombre')
      .where('stock.sedeId = :sedeId', { sedeId })
      .orderBy('stock.cantidad', 'ASC')
      .getRawMany<{
        id: string;
        varianteId: string;
        sedeId: string;
        cantidad: string;
        stockMinimo: string;
        stockMaximo?: string | null;
        nombreVariante: string;
        skuVariante: string;
        productoId: string;
        nombreProducto: string;
        categoriaNombre?: string | null;
      }>();

    return rows.map((row) => {
      const cantidad = Number(row.cantidad);
      const stockMinimo = Number(row.stockMinimo);
      const stockMaximo = row.stockMaximo != null ? Number(row.stockMaximo) : null;
      return {
        id: row.id,
        varianteId: row.varianteId,
        sedeId: row.sedeId,
        cantidad,
        stockMinimo,
        stockMaximo,
        nombreVariante: row.nombreVariante,
        skuVariante: row.skuVariante,
        productoId: row.productoId,
        nombreProducto: row.nombreProducto,
        categoriaNombre: row.categoriaNombre ?? null,
        alertaStockMinimo: cantidad < stockMinimo,
      };
    });
  }

  async getAlertasActivas(sedeId?: string) {
    const qb = this.alertaRepository
      .createQueryBuilder('alerta')
      .innerJoin(Variante, 'variante', 'variante.id = alerta.varianteId')
      .innerJoin(Producto, 'producto', 'producto.id = variante.productoId')
      .leftJoin('categorias', 'categoria', 'categoria.id = producto.categoriaId')
      .select('alerta.id', 'id')
      .addSelect('alerta.tipo', 'tipo')
      .addSelect('alerta.varianteId', 'varianteId')
      .addSelect('alerta.sedeId', 'sedeId')
      .addSelect('alerta.cantidad', 'cantidad')
      .addSelect('alerta.createdAt', 'createdAt')
      .addSelect('variante.nombre', 'nombreVariante')
      .addSelect('variante.sku', 'skuVariante')
      .addSelect('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombreProducto')
      .addSelect('categoria.nombre', 'categoriaNombre')
      .where('alerta.atendida = false')
      .orderBy('alerta.createdAt', 'DESC');

    if (sedeId) {
      await this.validarSedeActiva(sedeId);
      qb.andWhere('alerta.sedeId = :sedeId', { sedeId });
    }

    const rows = await qb.getRawMany<{
      id: string;
      tipo: TipoAlertaStock;
      varianteId: string;
      sedeId: string;
      cantidad: string;
      createdAt: Date;
      nombreVariante: string;
      skuVariante: string;
      productoId: string;
      nombreProducto: string;
      categoriaNombre?: string | null;
    }>();

    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      varianteId: row.varianteId,
      sedeId: row.sedeId,
      cantidad: Number(row.cantidad),
      createdAt: row.createdAt,
      nombreVariante: row.nombreVariante,
      skuVariante: row.skuVariante,
      productoId: row.productoId,
      nombreProducto: row.nombreProducto,
      categoriaNombre: row.categoriaNombre ?? null,
    }));
  }

  async generarReporteMovimientos(filtros: FiltrosMovimientoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.movimientoRepository
      .createQueryBuilder('movimiento')
      .innerJoin(Variante, 'variante', 'variante.id = movimiento.varianteId')
      .innerJoin(Producto, 'producto', 'producto.id = variante.productoId')
      .select('movimiento.id', 'id')
      .addSelect('movimiento.tipo', 'tipo')
      .addSelect('movimiento.varianteId', 'varianteId')
      .addSelect('movimiento.sedeOrigenId', 'sedeOrigenId')
      .addSelect('movimiento.sedeDestinoId', 'sedeDestinoId')
      .addSelect('movimiento.cantidad', 'cantidad')
      .addSelect('movimiento.cantidadAnterior', 'cantidadAnterior')
      .addSelect('movimiento.cantidadNueva', 'cantidadNueva')
      .addSelect('movimiento.motivo', 'motivo')
      .addSelect('movimiento.referencia', 'referencia')
      .addSelect('movimiento.realizadoPorId', 'realizadoPorId')
      .addSelect('movimiento.createdAt', 'createdAt')
      .addSelect('variante.nombre', 'nombreVariante')
      .addSelect('variante.sku', 'skuVariante')
      .addSelect('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombreProducto')
      .orderBy('movimiento.createdAt', 'DESC');

    if (filtros.varianteId) {
      qb.andWhere('movimiento.varianteId = :varianteId', { varianteId: filtros.varianteId });
    }

    if (filtros.sedeId) {
      qb.andWhere('(movimiento.sedeOrigenId = :sedeId OR movimiento.sedeDestinoId = :sedeId)', {
        sedeId: filtros.sedeId,
      });
    }

    if (filtros.tipo) {
      qb.andWhere('movimiento.tipo = :tipo', { tipo: filtros.tipo });
    }

    if (filtros.fechaDesde) {
      qb.andWhere('movimiento.createdAt >= :fechaDesde', {
        fechaDesde: new Date(filtros.fechaDesde),
      });
    }

    if (filtros.fechaHasta) {
      const fechaFin = new Date(filtros.fechaHasta);
      fechaFin.setHours(23, 59, 59, 999);
      qb.andWhere('movimiento.createdAt <= :fechaHasta', { fechaHasta: fechaFin });
    }

    const [rows, total] = await Promise.all([
      qb.clone().offset(offset).limit(limit).getRawMany<{
        id: string;
        tipo: TipoMovimiento;
        varianteId: string;
        sedeOrigenId?: string | null;
        sedeDestinoId?: string | null;
        cantidad: string;
        cantidadAnterior: string;
        cantidadNueva: string;
        motivo?: string | null;
        referencia?: string | null;
        realizadoPorId: string;
        createdAt: Date;
        nombreVariante: string;
        skuVariante: string;
        productoId: string;
        nombreProducto: string;
      }>(),
      qb.clone().getCount(),
    ]);

    const qbTotales = this.movimientoRepository.createQueryBuilder('movimiento');

    if (filtros.varianteId) {
      qbTotales.andWhere('movimiento.varianteId = :varianteId', { varianteId: filtros.varianteId });
    }

    if (filtros.sedeId) {
      qbTotales.andWhere(
        '(movimiento.sedeOrigenId = :sedeId OR movimiento.sedeDestinoId = :sedeId)',
        {
          sedeId: filtros.sedeId,
        },
      );
    }

    if (filtros.tipo) {
      qbTotales.andWhere('movimiento.tipo = :tipo', { tipo: filtros.tipo });
    }

    if (filtros.fechaDesde) {
      qbTotales.andWhere('movimiento.createdAt >= :fechaDesde', {
        fechaDesde: new Date(filtros.fechaDesde),
      });
    }

    if (filtros.fechaHasta) {
      const fechaFin = new Date(filtros.fechaHasta);
      fechaFin.setHours(23, 59, 59, 999);
      qbTotales.andWhere('movimiento.createdAt <= :fechaHasta', { fechaHasta: fechaFin });
    }

    const totalesRaw = await qbTotales
      .select('movimiento.tipo', 'tipo')
      .addSelect('COUNT(movimiento.id)', 'cantidad')
      .groupBy('movimiento.tipo')
      .getRawMany<{ tipo: TipoMovimiento; cantidad: string }>();

    const items = rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      varianteId: row.varianteId,
      sedeOrigenId: row.sedeOrigenId ?? null,
      sedeDestinoId: row.sedeDestinoId ?? null,
      cantidad: Number(row.cantidad),
      cantidadAnterior: Number(row.cantidadAnterior),
      cantidadNueva: Number(row.cantidadNueva),
      motivo: row.motivo ?? null,
      referencia: row.referencia ?? null,
      realizadoPorId: row.realizadoPorId,
      createdAt: row.createdAt,
      nombreVariante: row.nombreVariante,
      skuVariante: row.skuVariante,
      productoId: row.productoId,
      nombreProducto: row.nombreProducto,
    }));

    const totalesPorTipo = Object.values(TipoMovimiento).reduce<Record<string, number>>(
      (acc, tipo) => {
        acc[tipo] = 0;
        return acc;
      },
      {},
    );

    for (const row of totalesRaw) {
      totalesPorTipo[row.tipo] = Number(row.cantidad);
    }

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      totalesPorTipo,
      items,
    };
  }

  async getMovimientos() {
    return this.generarReporteMovimientos({ page: 1, limit: 100 });
  }

  async getAlertasStockBajo(sedeId: string) {
    const alertas = await this.getAlertasActivas(sedeId);
    return alertas.filter((alerta) => alerta.tipo === TipoAlertaStock.BAJO_MINIMO);
  }

  async ajustarStock(dto: AjustarStockDto, realizadoPorId: string) {
    return this.ajustar(dto, realizadoPorId);
  }

  async getInventarioValorizado(sedeId?: string) {
    if (sedeId) {
      await this.validarSedeActiva(sedeId);
    }

    const qb = this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin(Variante, 'variante', 'variante.id = stock.varianteId')
      .innerJoin(Producto, 'producto', 'producto.id = variante.productoId')
      .leftJoin('categorias', 'categoria', 'categoria.id = producto.categoriaId')
      .select('COALESCE(categoria.id, :sinCategoriaId)', 'categoriaId')
      .addSelect('COALESCE(categoria.nombre, :sinCategoriaNombre)', 'categoriaNombre')
      .addSelect(
        'COALESCE(SUM(stock.cantidad * COALESCE(producto.precioCompra, 0)), 0)',
        'valorTotal',
      )
      .addSelect('COALESCE(SUM(stock.cantidad), 0)', 'cantidadTotal')
      .setParameter('sinCategoriaId', 'sin-categoria')
      .setParameter('sinCategoriaNombre', 'Sin categoria')
      .groupBy('categoria.id')
      .addGroupBy('categoria.nombre')
      .orderBy('COALESCE(SUM(stock.cantidad * COALESCE(producto.precioCompra, 0)), 0)', 'DESC');

    if (sedeId) {
      qb.where('stock.sedeId = :sedeId', { sedeId });
    }

    const rows = await qb.getRawMany<{
      categoriaId: string;
      categoriaNombre: string;
      valorTotal: string;
      cantidadTotal: string;
    }>();

    const categorias = rows.map((row) => ({
      categoriaId: row.categoriaId,
      categoriaNombre: row.categoriaNombre,
      cantidadTotal: Number(row.cantidadTotal),
      valorTotal: Number(row.valorTotal),
    }));

    return {
      sedeId: sedeId ?? null,
      valorTotalInventario: categorias.reduce((acc, item) => acc + item.valorTotal, 0),
      categorias,
    };
  }
}
