import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { DataSource, Repository } from 'typeorm';
import { Sede } from '../sedes/entities/sede.entity';
import { Variante } from '../catalogo/variantes/entities/variante.entity';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { TrasladarStockDto } from './dto/trasladar-stock.dto';
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

    const resultado = await this.dataSource.transaction(async (manager) => {
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
          activo: true,
        });
      }

      if (!stock.activo) {
        stock.activo = true;
      }

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

      const movimiento = movimientoRepo.create({
        tipo: dto.tipo,
        varianteId: dto.varianteId,
        sedeId: dto.sedeId,
        cantidad: dto.cantidad,
        sedeDestinoId: dto.sedeDestinoId,
        usuarioId,
        motivo: dto.motivo,
        activo: true,
      });

      const movimientoGuardado = await movimientoRepo.save(movimiento);

      return {
        movimiento: movimientoGuardado,
        stock: stockGuardado,
      };
    });

    return resultado;
  }

  async getStockPorSede(sedeId: string) {
    await this.validarSedeActiva(sedeId);

    const stocks = await this.stockRepository.find({
      where: { sedeId, activo: true },
      order: { cantidad: 'ASC' },
    });

    return stocks.map((stock) => ({
      ...stock,
      alertaStockMinimo: stock.cantidad < stock.stockMinimo,
    }));
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

      if (!stockOrigen || !stockOrigen.activo || stockOrigen.cantidad < dto.cantidad) {
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
          activo: true,
        });
      }

      if (!stockDestino.activo) {
        stockDestino.activo = true;
      }

      stockOrigen.cantidad -= dto.cantidad;
      stockDestino.cantidad += dto.cantidad;

      const [stockOrigenGuardado, stockDestinoGuardado] = await Promise.all([
        stockRepo.save(stockOrigen),
        stockRepo.save(stockDestino),
      ]);

      const movimiento = movimientoRepo.create({
        tipo: TipoMovimiento.TRASLADO,
        varianteId: dto.varianteId,
        sedeId: dto.sedeOrigen,
        sedeDestinoId: dto.sedeDestino,
        cantidad: dto.cantidad,
        usuarioId,
        motivo: dto.motivo,
        activo: true,
      });

      const movimientoGuardado = await movimientoRepo.save(movimiento);

      return {
        movimiento: movimientoGuardado,
        stockOrigen: stockOrigenGuardado,
        stockDestino: stockDestinoGuardado,
      };
    });
  }

  async getMovimientos() {
    return this.movimientoRepository.find({
      where: { activo: true },
      order: { createdAt: 'DESC' },
    });
  }
}
