import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActualizarPreciosLoteDto } from './dto/actualizar-precios-lote.dto';
import { CreateInversionItemDto } from './dto/create-inversion-item.dto';
import { CreateInversionistaDto } from './dto/create-inversionista.dto';
import { CreatePortafolioDto } from './dto/create-portafolio.dto';
import { CreateMovimientoInversionDto } from './dto/create-movimiento-inversion.dto';
import { UpdateInversionItemDto } from './dto/update-inversion-item.dto';
import { UpdateInversionistaDto } from './dto/update-inversionista.dto';
import { UpdateMovimientoInversionDto } from './dto/update-movimiento-inversion.dto';
import { UpdatePortafolioDto } from './dto/update-portafolio.dto';
import { InversionItem, TipoInversionItem } from './entities/inversion-item.entity';
import { Inversionista } from './entities/inversionista.entity';
import { MovimientoInversion } from './entities/movimiento-inversion.entity';
import { Portafolio } from './entities/portafolio.entity';

@Injectable()
export class InversionistasService {
  constructor(
    @InjectRepository(Inversionista)
    private readonly inversionistasRepository: Repository<Inversionista>,
    @InjectRepository(Portafolio)
    private readonly portafoliosRepository: Repository<Portafolio>,
    @InjectRepository(InversionItem)
    private readonly itemsRepository: Repository<InversionItem>,
    @InjectRepository(MovimientoInversion)
    private readonly movimientosRepository: Repository<MovimientoInversion>,
  ) {}

  async createInversionista(dto: CreateInversionistaDto, empresaId?: string | null) {
    const inversionista = this.inversionistasRepository.create({
      ...dto,
      empresaId: empresaId ?? null,
      montoMaximoInversion: dto.montoMaximoInversion ?? null,
      documentosVerificados: dto.documentosVerificados ?? false,
    });
    return this.inversionistasRepository.save(inversionista);
  }

  async findInversionistas(empresaId?: string | null) {
    return this.inversionistasRepository.find({ where: empresaId ? { empresaId } : undefined });
  }

  async findInversionista(id: string, empresaId?: string | null) {
    const inversionista = await this.inversionistasRepository.findOne({
      where: empresaId ? { id, empresaId } : { id },
    });
    if (!inversionista) throw new NotFoundException('Inversionista no encontrado');
    return inversionista;
  }

  async updateInversionista(id: string, dto: UpdateInversionistaDto, empresaId?: string | null) {
    const inversionista = await this.findInversionista(id, empresaId);
    Object.assign(inversionista, dto);
    return this.inversionistasRepository.save(inversionista);
  }

  async removeInversionista(id: string, empresaId?: string | null) {
    const inversionista = await this.findInversionista(id, empresaId);
    await this.inversionistasRepository.remove(inversionista);
    return { ok: true };
  }

  async createPortafolio(dto: CreatePortafolioDto, empresaId?: string | null) {
    const portafolio = this.portafoliosRepository.create({
      ...dto,
      empresaId: empresaId ?? null,
      descripcion: dto.descripcion ?? null,
      activo: dto.activo ?? true,
    });
    return this.portafoliosRepository.save(portafolio);
  }

  async findPortafolios(empresaId?: string | null) {
    return this.portafoliosRepository.find({
      where: empresaId ? { empresaId } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async findPortafolio(id: string, empresaId?: string | null) {
    const portafolio = await this.portafoliosRepository.findOne({
      where: empresaId ? { id, empresaId } : { id },
    });
    if (!portafolio) throw new NotFoundException('Portafolio no encontrado');
    return portafolio;
  }

  async updatePortafolio(id: string, dto: UpdatePortafolioDto, empresaId?: string | null) {
    const portafolio = await this.findPortafolio(id, empresaId);
    Object.assign(portafolio, dto);
    return this.portafoliosRepository.save(portafolio);
  }

  async removePortafolio(id: string, empresaId?: string | null) {
    const portafolio = await this.findPortafolio(id, empresaId);
    await this.portafoliosRepository.remove(portafolio);
    return { ok: true };
  }

  async createItem(dto: CreateInversionItemDto, empresaId?: string | null) {
    const item = this.itemsRepository.create({
      ...dto,
      empresaId: empresaId ?? null,
      simbolo: dto.simbolo ?? null,
      moneda: dto.moneda ?? 'COP',
      fechaVencimiento: dto.fechaVencimiento ?? null,
      dividendos: dto.dividendos ?? 0,
      notas: dto.notas ?? null,
    });
    return this.itemsRepository.save(item);
  }

  async findItems(portafolioId?: string, empresaId?: string | null) {
    const where: Record<string, unknown> = {};
    if (portafolioId) where.portafolioId = portafolioId;
    if (empresaId) where.empresaId = empresaId;

    return this.itemsRepository.find({
      where: Object.keys(where).length ? where : undefined,
      order: { updatedAt: 'DESC' },
    });
  }

  async findItem(id: string, empresaId?: string | null) {
    const item = await this.itemsRepository.findOne({
      where: empresaId ? { id, empresaId } : { id },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  async updateItem(id: string, dto: UpdateInversionItemDto, empresaId?: string | null) {
    const item = await this.findItem(id, empresaId);
    Object.assign(item, dto);
    return this.itemsRepository.save(item);
  }

  async removeItem(id: string, empresaId?: string | null) {
    const item = await this.findItem(id, empresaId);
    await this.itemsRepository.remove(item);
    return { ok: true };
  }

  async createMovimiento(dto: CreateMovimientoInversionDto, empresaId?: string | null) {
    const movimiento = this.movimientosRepository.create({
      ...dto,
      empresaId: empresaId ?? null,
      cantidadUnidades: dto.cantidadUnidades ?? null,
      nota: dto.nota ?? null,
    });
    return this.movimientosRepository.save(movimiento);
  }

  async findMovimientos(itemId?: string, empresaId?: string | null) {
    const where: Record<string, unknown> = {};
    if (itemId) where.itemId = itemId;
    if (empresaId) where.empresaId = empresaId;

    return this.movimientosRepository.find({
      where: Object.keys(where).length ? where : undefined,
      order: { fecha: 'DESC' },
    });
  }

  async findMovimiento(id: string, empresaId?: string | null) {
    const movimiento = await this.movimientosRepository.findOne({
      where: empresaId ? { id, empresaId } : { id },
    });
    if (!movimiento) throw new NotFoundException('Movimiento no encontrado');
    return movimiento;
  }

  async updateMovimiento(id: string, dto: UpdateMovimientoInversionDto, empresaId?: string | null) {
    const movimiento = await this.findMovimiento(id, empresaId);
    Object.assign(movimiento, dto);
    return this.movimientosRepository.save(movimiento);
  }

  async removeMovimiento(id: string, empresaId?: string | null) {
    const movimiento = await this.findMovimiento(id, empresaId);
    await this.movimientosRepository.remove(movimiento);
    return { ok: true };
  }

  async actualizarPreciosLote(
    portafolioId: string,
    dto: ActualizarPreciosLoteDto,
    empresaId?: string | null,
  ) {
    const existentes = await this.itemsRepository.find({
      where: empresaId ? { portafolioId, empresaId } : { portafolioId },
    });
    const existentesMap = new Map(existentes.map((item) => [item.id, item]));

    for (const entry of dto.items) {
      const item = existentesMap.get(entry.itemId);
      if (!item) continue;
      item.precioActual = entry.precioActual;
      await this.itemsRepository.save(item);
    }

    return {
      ok: true,
      actualizados: dto.items.filter((item) => existentesMap.has(item.itemId)).length,
    };
  }

  async getResumenPortafolio(portafolioId: string, empresaId?: string | null) {
    await this.findPortafolio(portafolioId, empresaId);
    const items = await this.itemsRepository.find({
      where: { portafolioId, ...(empresaId ? { empresaId } : {}) },
    });

    const valorCosto = items.reduce(
      (acc, item) => acc + Number(item.cantidadUnidades) * Number(item.precioCompra),
      0,
    );
    const valorActual = items.reduce(
      (acc, item) => acc + Number(item.cantidadUnidades) * Number(item.precioActual),
      0,
    );
    const gananciaAbsoluta = valorActual - valorCosto;
    const gananciaRelativa = valorCosto > 0 ? (gananciaAbsoluta / valorCosto) * 100 : 0;

    const distribucionMap = new Map<TipoInversionItem, number>();
    for (const item of items) {
      const valor = Number(item.cantidadUnidades) * Number(item.precioActual);
      distribucionMap.set(item.tipo, (distribucionMap.get(item.tipo) ?? 0) + valor);
    }

    const distribucionPorTipo = Array.from(distribucionMap.entries()).map(([tipo, valor]) => ({
      tipo,
      porcentaje: valorActual > 0 ? (valor / valorActual) * 100 : 0,
    }));

    const itemsResumen = items.map((item) => {
      const costo = Number(item.cantidadUnidades) * Number(item.precioCompra);
      const actual = Number(item.cantidadUnidades) * Number(item.precioActual);
      const ganancia = actual - costo;
      return {
        ...item,
        costo,
        valorActual: actual,
        gananciaAbsoluta: ganancia,
        gananciaRelativa: costo > 0 ? (ganancia / costo) * 100 : 0,
      };
    });

    return {
      valorCosto,
      valorActual,
      gananciaAbsoluta,
      gananciaRelativa,
      distribucionPorTipo,
      items: itemsResumen,
    };
  }

  async getVencimientosProximos(dias = 30, empresaId?: string | null) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const hoy = new Date().toISOString().slice(0, 10);
    const fin = limite.toISOString().slice(0, 10);

    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.tipo IN (:...tipos)', { tipos: [TipoInversionItem.CDT, TipoInversionItem.BONO] })
      .andWhere('item.fechaVencimiento IS NOT NULL')
      .andWhere('item.fechaVencimiento BETWEEN :hoy AND :fin', { hoy, fin })
      .orderBy('item.fechaVencimiento', 'ASC');

    if (empresaId) qb.andWhere('item.empresaId = :empresaId', { empresaId });

    return qb.getMany();
  }
}
