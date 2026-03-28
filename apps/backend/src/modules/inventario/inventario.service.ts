import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Sede } from '../sedes/entities/sede.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { TrasladarStockDto } from './dto/trasladar-stock.dto';
import { AjustarStockDto, TipoAjusteInventario } from './dto/ajustar-stock.dto';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { StockSede } from './entities/stock-sede.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(StockSede)
    private readonly stockRepository: Repository<StockSede>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientoRepository: Repository<MovimientoInventario>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private generarNumeroMovimiento(): string {
    const year = new Date().getFullYear();
    const correlativo = Date.now().toString().slice(-6);
    return `MOV-${year}-${correlativo}`;
  }

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
    if (!variante || !variante.producto?.activo) {
      throw new NotFoundException('Variante no encontrada o inactiva');
    }
  }

  async registrarMovimiento(dto: RegistrarMovimientoDto, usuarioId: string) {
    await this.validarVarianteActiva(dto.varianteId);
    await this.validarSedeActiva(dto.sedeId);

    const resultado = await this.dataSource.transaction((manager) =>
      this.registrarMovimientoConManager(dto, usuarioId, manager),
    );

    return resultado;
  }

  async registrarMovimientoConManager(
    dto: RegistrarMovimientoDto,
    usuarioId: string,
    manager: EntityManager,
  ) {
    const stockRepo = manager.getRepository(StockSede);
    const movimientoRepo = manager.getRepository(MovimientoInventario);

    let stock = await stockRepo.findOne({
      where: { varianteId: dto.varianteId, sedeId: dto.sedeId },
    });

    if (!stock) {
      stock = stockRepo.create({
        varianteId: dto.varianteId,
        sedeId: dto.sedeId,
        cantidad: 0,
        stockMinimo: 0,
      });
    }

    const stockAnterior = stock.cantidad;

    const tipoSuma = [
      TipoMovimiento.ENTRADA,
      TipoMovimiento.AJUSTE,
      TipoMovimiento.DEVOLUCION,
    ].includes(dto.tipo);

    if (tipoSuma) {
      stock.cantidad += dto.cantidad;
    } else {
      if (stock.cantidad < dto.cantidad) {
        throw new BadRequestException('Stock insuficiente para la operacion');
      }
      stock.cantidad -= dto.cantidad;
    }

    const stockGuardado = await stockRepo.save(stock);

    const variante = await this.variantesRepository.findOne({ where: { id: dto.varianteId } });
    if (!variante) {
      throw new NotFoundException('Variante no encontrada para registrar movimiento');
    }

    const movimiento = movimientoRepo.create({
      numeroDoc: this.generarNumeroMovimiento(),
      tipo: dto.tipo,
      varianteId: dto.varianteId,
      productoId: variante.productoId,
      sedeId: dto.sedeId,
      cantidad: dto.cantidad,
      sedeDestinoId: dto.sedeDestinoId,
      usuarioId,
      motivo: dto.motivo,
      stockAnterior,
      stockNuevo: stockGuardado.cantidad,
    });

    const movimientoGuardado = await movimientoRepo.save(movimiento);

    return {
      movimiento: movimientoGuardado,
      stock: stockGuardado,
    };
  }

  async getStockPorSede(sedeId: string) {
    await this.validarSedeActiva(sedeId);

    const stocks = await this.stockRepository.find({
      where: { sedeId },
      order: { cantidad: 'ASC' },
    });

    return stocks.map((stock) => ({
      ...stock,
      alertaStockMinimo: stock.cantidad < stock.stockMinimo,
    }));
  }

  async getAlertasStockBajo(sedeId: string) {
    const stocks = await this.getStockPorSede(sedeId);
    return stocks.filter((stock) => stock.cantidad <= stock.stockMinimo);
  }

  async trasladar(dto: TrasladarStockDto, usuarioId: string) {
    if (dto.sedeOrigen === dto.sedeDestino) {
      throw new BadRequestException('La sede origen y destino deben ser diferentes');
    }

    await this.validarVarianteActiva(dto.varianteId);
    await this.validarSedeActiva(dto.sedeOrigen);
    await this.validarSedeActiva(dto.sedeDestino);

    return this.dataSource.transaction(async (manager) => {
      const stockRepo = manager.getRepository(StockSede);
      const movimientoRepo = manager.getRepository(MovimientoInventario);

      let stockOrigen = await stockRepo.findOne({
        where: { varianteId: dto.varianteId, sedeId: dto.sedeOrigen },
      });

      if (!stockOrigen || stockOrigen.cantidad < dto.cantidad) {
        throw new BadRequestException('Stock insuficiente en sede origen para el traslado');
      }

      let stockDestino = await stockRepo.findOne({
        where: { varianteId: dto.varianteId, sedeId: dto.sedeDestino },
      });

      if (!stockDestino) {
        stockDestino = stockRepo.create({
          varianteId: dto.varianteId,
          sedeId: dto.sedeDestino,
          cantidad: 0,
          stockMinimo: 0,
        });
      }

      const stockAnteriorOrigen = stockOrigen.cantidad;
      const stockAnteriorDestino = stockDestino.cantidad;

      stockOrigen.cantidad -= dto.cantidad;
      stockDestino.cantidad += dto.cantidad;

      const [stockOrigenGuardado, stockDestinoGuardado] = await Promise.all([
        stockRepo.save(stockOrigen),
        stockRepo.save(stockDestino),
      ]);

      const variante = await this.variantesRepository.findOne({ where: { id: dto.varianteId } });
      if (!variante) {
        throw new NotFoundException('Variante no encontrada para registrar traslado');
      }

      const movimiento = movimientoRepo.create({
        numeroDoc: this.generarNumeroMovimiento(),
        tipo: TipoMovimiento.TRASLADO,
        varianteId: dto.varianteId,
        productoId: variante.productoId,
        sedeId: dto.sedeOrigen,
        sedeDestinoId: dto.sedeDestino,
        cantidad: dto.cantidad,
        usuarioId,
        motivo: dto.motivo,
        stockAnterior: stockAnteriorOrigen,
        stockNuevo: stockOrigenGuardado.cantidad,
      });

      const movimientoGuardado = await movimientoRepo.save(movimiento);

      await movimientoRepo.save(
        movimientoRepo.create({
          numeroDoc: this.generarNumeroMovimiento(),
          tipo: TipoMovimiento.ENTRADA,
          varianteId: dto.varianteId,
          productoId: variante.productoId,
          sedeId: dto.sedeDestino,
          cantidad: dto.cantidad,
          usuarioId,
          motivo: dto.motivo,
          stockAnterior: stockAnteriorDestino,
          stockNuevo: stockDestinoGuardado.cantidad,
        }),
      );

      return {
        movimiento: movimientoGuardado,
        stockOrigen: stockOrigenGuardado,
        stockDestino: stockDestinoGuardado,
      };
    });
  }

  async getMovimientos() {
    return this.movimientoRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async ajustarStock(dto: AjustarStockDto, usuarioId: string) {
    const tipo =
      dto.motivo === TipoAjusteInventario.INGRESO
        ? TipoMovimiento.ENTRADA
        : dto.motivo === TipoAjusteInventario.MERMA
          ? TipoMovimiento.SALIDA
          : dto.motivo === TipoAjusteInventario.DEVOLUCION
            ? TipoMovimiento.DEVOLUCION
            : TipoMovimiento.AJUSTE;

    return this.registrarMovimiento(
      {
        tipo,
        varianteId: dto.varianteId,
        sedeId: dto.sedeId,
        cantidad: dto.cantidad,
        motivo: dto.nota?.trim() ? `${dto.motivo}: ${dto.nota.trim()}` : dto.motivo,
      },
      usuarioId,
    );
  }
}
