import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { CreateInmuebleDto } from './dto/create-inmueble.dto';
import { FiltrosInmueblesDto } from './dto/filtros-inmuebles.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { UpdateInmuebleDto } from './dto/update-inmueble.dto';
import {
  ContratoArrendamiento,
  EstadoContratoArrendamiento,
} from './entities/contrato-arrendamiento.entity';
import { EstadoInmueble, Inmueble } from './entities/inmueble.entity';
import { EstadoPagoArriendo, PagoArriendo } from './entities/pago-arriendo.entity';

@Injectable()
export class InmobiliariaService {
  constructor(
    @InjectRepository(Inmueble)
    private readonly inmueblesRepository: Repository<Inmueble>,
    @InjectRepository(ContratoArrendamiento)
    private readonly contratosRepository: Repository<ContratoArrendamiento>,
    @InjectRepository(PagoArriendo)
    private readonly pagosRepository: Repository<PagoArriendo>,
  ) {}

  async createInmueble(dto: CreateInmuebleDto, empresaId?: string | null) {
    const codigo = await this.generarCodigoInmueble();
    const inmueble = this.inmueblesRepository.create({
      ...dto,
      codigo,
      empresaId: empresaId ?? null,
      estado: dto.estado ?? EstadoInmueble.DISPONIBLE,
      barrio: dto.barrio ?? null,
      estrato: dto.estrato ?? null,
      habitaciones: dto.habitaciones ?? null,
      banos: dto.banos ?? null,
      parqueaderos: dto.parqueaderos ?? null,
      valorVenta: dto.valorVenta ?? null,
      valorArriendo: dto.valorArriendo ?? null,
      valorAdministracion: dto.valorAdministracion ?? null,
      propietarioId: dto.propietarioId ?? null,
      fotos: dto.fotos ?? [],
      descripcion: dto.descripcion ?? null,
      latitud: dto.latitud ?? null,
      longitud: dto.longitud ?? null,
    });
    return this.inmueblesRepository.save(inmueble);
  }

  async findInmuebles(filtros: FiltrosInmueblesDto, empresaId?: string | null) {
    const qb = this.inmueblesRepository
      .createQueryBuilder('inmueble')
      .orderBy('inmueble.createdAt', 'DESC');

    if (empresaId) qb.andWhere('inmueble.empresaId = :empresaId', { empresaId });
    if (filtros.tipo) qb.andWhere('inmueble.tipo = :tipo', { tipo: filtros.tipo });
    if (filtros.estado) qb.andWhere('inmueble.estado = :estado', { estado: filtros.estado });
    if (filtros.negocio) qb.andWhere('inmueble.negocio = :negocio', { negocio: filtros.negocio });
    if (filtros.ciudad)
      qb.andWhere('LOWER(inmueble.ciudad) = LOWER(:ciudad)', { ciudad: filtros.ciudad });
    if (filtros.valorMin !== undefined) {
      qb.andWhere('COALESCE(inmueble.valorVenta, inmueble.valorArriendo, 0) >= :valorMin', {
        valorMin: filtros.valorMin,
      });
    }
    if (filtros.valorMax !== undefined) {
      qb.andWhere('COALESCE(inmueble.valorVenta, inmueble.valorArriendo, 0) <= :valorMax', {
        valorMax: filtros.valorMax,
      });
    }
    if (filtros.areaMin !== undefined)
      qb.andWhere('inmueble.areaTotalM2 >= :areaMin', { areaMin: filtros.areaMin });
    if (filtros.areaMax !== undefined)
      qb.andWhere('inmueble.areaTotalM2 <= :areaMax', { areaMax: filtros.areaMax });

    return qb.getMany();
  }

  async findOneInmueble(id: string, empresaId?: string | null) {
    const where = empresaId ? { id, empresaId } : { id };
    const inmueble = await this.inmueblesRepository.findOne({ where });
    if (!inmueble) throw new NotFoundException('Inmueble no encontrado');
    return inmueble;
  }

  async updateInmueble(id: string, dto: UpdateInmuebleDto, empresaId?: string | null) {
    const inmueble = await this.findOneInmueble(id, empresaId);
    Object.assign(inmueble, dto);
    return this.inmueblesRepository.save(inmueble);
  }

  async removeInmueble(id: string, empresaId?: string | null) {
    const inmueble = await this.findOneInmueble(id, empresaId);
    await this.inmueblesRepository.remove(inmueble);
    return { ok: true };
  }

  async createContrato(dto: CreateContratoDto, empresaId?: string | null) {
    const contrato = this.contratosRepository.create({
      ...dto,
      empresaId: empresaId ?? null,
      incrementoPorcentaje: dto.incrementoPorcentaje ?? null,
      estado: EstadoContratoArrendamiento.ACTIVO,
    });
    return this.contratosRepository.save(contrato);
  }

  async findContratos(empresaId?: string | null) {
    return this.contratosRepository.find({
      where: empresaId ? { empresaId } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async findContrato(id: string, empresaId?: string | null) {
    const contrato = await this.contratosRepository.findOne({
      where: empresaId ? { id, empresaId } : { id },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado');
    return contrato;
  }

  async updateContrato(id: string, dto: UpdateContratoDto, empresaId?: string | null) {
    const contrato = await this.findContrato(id, empresaId);
    Object.assign(contrato, dto);
    return this.contratosRepository.save(contrato);
  }

  async removeContrato(id: string, empresaId?: string | null) {
    const contrato = await this.findContrato(id, empresaId);
    await this.contratosRepository.remove(contrato);
    return { ok: true };
  }

  async registrarPago(
    contratoId: string,
    mes: number,
    anio: number,
    monto: number,
    empresaId?: string | null,
  ) {
    const pago = await this.pagosRepository.findOne({
      where: empresaId ? { contratoId, mes, anio, empresaId } : { contratoId, mes, anio },
    });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado para el periodo indicado');
    }

    pago.monto = monto;
    pago.estado = EstadoPagoArriendo.PAGADO;
    pago.fechaPago = new Date().toISOString().slice(0, 10);
    return this.pagosRepository.save(pago);
  }

  async getPagosPendientes(contratoId?: string, empresaId?: string | null) {
    const qb = this.pagosRepository
      .createQueryBuilder('pago')
      .where('pago.estado IN (:...estados)', {
        estados: [EstadoPagoArriendo.PENDIENTE, EstadoPagoArriendo.VENCIDO],
      })
      .orderBy('pago.anio', 'DESC')
      .addOrderBy('pago.mes', 'DESC');

    if (empresaId) qb.andWhere('pago.empresaId = :empresaId', { empresaId });
    if (contratoId) qb.andWhere('pago.contratoId = :contratoId', { contratoId });

    return qb.getMany();
  }

  async getIngresosMensual(mes: number, anio: number, empresaId?: string | null) {
    const [pagosRecibidosRaw, canonEsperadoRaw] = await Promise.all([
      this.pagosRepository
        .createQueryBuilder('pago')
        .select('COALESCE(SUM(pago.monto), 0)', 'total')
        .where('pago.estado = :estado', { estado: EstadoPagoArriendo.PAGADO })
        .andWhere('pago.mes = :mes', { mes })
        .andWhere('pago.anio = :anio', { anio })
        .andWhere(empresaId ? 'pago.empresaId = :empresaId' : '1=1', { empresaId })
        .getRawOne<{ total: string }>(),
      this.contratosRepository
        .createQueryBuilder('contrato')
        .select('COALESCE(SUM(contrato.canonMensual), 0)', 'total')
        .where('contrato.estado = :estado', { estado: EstadoContratoArrendamiento.ACTIVO })
        .andWhere(empresaId ? 'contrato.empresaId = :empresaId' : '1=1', { empresaId })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      mes,
      anio,
      pagosRecibidos: Number(pagosRecibidosRaw?.total ?? 0),
      canonContratosActivos: Number(canonEsperadoRaw?.total ?? 0),
    };
  }

  @Cron('0 1 1 * *')
  async generarPagosDelMesCron() {
    await this.generarPagosDelMes();
  }

  async generarPagosDelMes() {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const contratosActivos = await this.contratosRepository.find({
      where: { estado: EstadoContratoArrendamiento.ACTIVO },
    });

    let creados = 0;

    for (const contrato of contratosActivos) {
      const existe = await this.pagosRepository.findOne({
        where: { contratoId: contrato.id, mes, anio },
      });
      if (existe) {
        continue;
      }

      const fechaVencimiento = new Date(anio, mes - 1, 10).toISOString().slice(0, 10);

      const pago = this.pagosRepository.create({
        contratoId: contrato.id,
        mes,
        anio,
        monto: contrato.canonMensual,
        fechaVencimiento,
        fechaPago: null,
        estado: EstadoPagoArriendo.PENDIENTE,
        penalidad: 0,
        empresaId: contrato.empresaId,
      });

      await this.pagosRepository.save(pago);
      creados += 1;
    }

    return { mes, anio, creados };
  }

  private async generarCodigoInmueble() {
    const raw = await this.inmueblesRepository
      .createQueryBuilder('inmueble')
      .select('COUNT(inmueble.id)', 'count')
      .getRawOne<{ count: string }>();
    const next = Number(raw?.count ?? 0) + 1;
    return `INM-${String(next).padStart(3, '0')}`;
  }
}
