import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta } from '@cosmeticos/shared-types';
import { Repository } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';

type TotalesSesion = {
  totalVentas: number;
  totalEfectivo: number;
};

export type SesionCajaResumen = {
  id: string;
  sedeId: string;
  usuarioId: string;
  fechaApertura: Date;
  fechaCierre?: Date | null;
  montoInicial: number;
  montoFinal?: number | null;
  totalVentas: number;
  totalEfectivo: number;
  diferencia?: number | null;
  estado: EstadoCaja;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajasRepository: Repository<Caja>,
    @InjectRepository(SesionCaja)
    private readonly sesionesRepository: Repository<SesionCaja>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
  ) {}

  private async validarSedeActiva(sedeId: string): Promise<void> {
    const sede = await this.sedesRepository.findOne({ where: { id: sedeId, activo: true } });
    if (!sede) {
      throw new NotFoundException('Sede no encontrada o inactiva');
    }
  }

  private async obtenerTotalesSesion(sesionId: string, sedeId: string): Promise<TotalesSesion> {
    const raw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('COALESCE(SUM(venta.total), 0)', 'totalVentas')
      .addSelect('COALESCE(SUM(venta.monto_efectivo), 0)', 'totalEfectivo')
      .where('venta."sesionCajaId" = :sesionId', { sesionId })
      .andWhere('venta."sedeId" = :sedeId', { sedeId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .getRawOne<{ totalVentas: string; totalEfectivo: string }>();

    return {
      totalVentas: Number(raw?.totalVentas ?? 0),
      totalEfectivo: Number(raw?.totalEfectivo ?? 0),
    };
  }

  private async mapearSesionResumen(
    sesion: SesionCaja,
    sedeId: string,
  ): Promise<SesionCajaResumen> {
    const totales = await this.obtenerTotalesSesion(sesion.id, sedeId);

    if (sesion.totalVentas !== totales.totalVentas) {
      sesion.totalVentas = totales.totalVentas;
      await this.sesionesRepository.save(sesion);
    }

    return {
      id: sesion.id,
      sedeId,
      usuarioId: sesion.usuarioAperturaId,
      fechaApertura: sesion.fechaApertura,
      fechaCierre: sesion.fechaCierre ?? null,
      montoInicial: Number(sesion.montoInicial),
      montoFinal: sesion.montoFinal == null ? null : Number(sesion.montoFinal),
      totalVentas: totales.totalVentas,
      totalEfectivo: totales.totalEfectivo,
      diferencia: sesion.diferencia == null ? null : Number(sesion.diferencia),
      estado: sesion.fechaCierre ? EstadoCaja.CERRADA : EstadoCaja.ABIERTA,
      activo: sesion.activo,
      createdAt: sesion.createdAt,
      updatedAt: sesion.updatedAt,
    };
  }

  private async getCajaAbiertaSesion(sedeId: string): Promise<SesionCaja | null> {
    await this.validarSedeActiva(sedeId);

    return this.sesionesRepository
      .createQueryBuilder('sesion')
      .innerJoin(Caja, 'caja', 'caja.id = sesion."cajaId"')
      .where('caja."sedeId" = :sedeId', { sedeId })
      .andWhere('caja.activa = true')
      .andWhere('sesion.activa = true')
      .orderBy('sesion.fecha_apertura', 'DESC')
      .getOne();
  }

  private async obtenerOCrearCajaPorSede(sedeId: string): Promise<Caja> {
    const existente = await this.cajasRepository.findOne({ where: { sedeId, activo: true } });
    if (existente) {
      return existente;
    }

    const codigo = `CAJA-${sedeId.slice(0, 8).toUpperCase()}`;
    const caja = this.cajasRepository.create({
      sedeId,
      codigo,
      nombre: 'Caja principal',
      activo: true,
    });
    return this.cajasRepository.save(caja);
  }

  async abrirCaja(
    sedeId: string,
    usuarioId: string,
    montoInicial: number,
  ): Promise<SesionCajaResumen> {
    await this.validarSedeActiva(sedeId);

    const cajaFisica = await this.obtenerOCrearCajaPorSede(sedeId);
    const abierta = await this.getCajaAbiertaSesion(sedeId);
    if (abierta) {
      throw new BadRequestException('Ya existe una caja abierta en esta sede');
    }

    const caja = this.sesionesRepository.create({
      cajaId: cajaFisica.id,
      usuarioAperturaId: usuarioId,
      fechaApertura: new Date(),
      montoInicial,
      totalVentas: 0,
      activo: true,
    });

    const guardada = await this.sesionesRepository.save(caja);
    return this.mapearSesionResumen(guardada, sedeId);
  }

  async cerrarCaja(
    cajaId: string,
    usuarioId: string,
    montoFinal: number,
  ): Promise<SesionCajaResumen> {
    const caja = await this.sesionesRepository.findOne({
      where: { id: cajaId, activo: true },
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    if (caja.fechaCierre) {
      throw new BadRequestException('La caja ya se encuentra cerrada');
    }

    const cajaFisica = await this.cajasRepository.findOne({
      where: { id: caja.cajaId, activo: true },
    });
    if (!cajaFisica) {
      throw new NotFoundException('Caja fisica no encontrada para la sesion');
    }

    const abiertasSede = await this.getCajaAbiertaSesion(cajaFisica.sedeId);
    if (!abiertasSede || abiertasSede.id !== caja.id) {
      throw new BadRequestException('La caja ya no esta activa para cierre');
    }

    const { totalVentas, totalEfectivo } = await this.obtenerTotalesSesion(
      caja.id,
      cajaFisica.sedeId,
    );
    const esperado = Number(caja.montoInicial) + totalEfectivo;
    const diferencia = montoFinal - esperado;

    caja.usuarioCierreId = usuarioId;
    caja.fechaCierre = new Date();
    caja.montoFinal = montoFinal;
    caja.totalVentas = totalVentas;
    caja.diferencia = diferencia;
    caja.activo = false;

    const cerrada = await this.sesionesRepository.save(caja);
    return this.mapearSesionResumen(cerrada, cajaFisica.sedeId);
  }

  async cerrarCajaActivaPorSede(
    sedeId: string,
    usuarioId: string,
    montoFinal: number,
  ): Promise<SesionCajaResumen> {
    const cajaActiva = await this.getCajaAbiertaSesion(sedeId);
    if (!cajaActiva) {
      throw new NotFoundException('No hay caja abierta para la sede enviada');
    }

    return this.cerrarCaja(cajaActiva.id, usuarioId, montoFinal);
  }

  async getCajaAbierta(sedeId: string): Promise<SesionCajaResumen | null> {
    const sesion = await this.getCajaAbiertaSesion(sedeId);
    if (!sesion) {
      return null;
    }

    return this.mapearSesionResumen(sesion, sedeId);
  }

  async getHistorial(sedeId: string): Promise<SesionCajaResumen[]> {
    await this.validarSedeActiva(sedeId);

    const sesiones = await this.sesionesRepository
      .createQueryBuilder('sesion')
      .innerJoin(Caja, 'caja', 'caja.id = sesion."cajaId"')
      .where('caja."sedeId" = :sedeId', { sedeId })
      .orderBy('sesion."createdAt"', 'DESC')
      .getMany();

    const historial = await Promise.all(
      sesiones.map((sesion) => this.mapearSesionResumen(sesion, sedeId)),
    );

    return historial;
  }

  async actualizarTotalesCaja(cajaId: string): Promise<SesionCaja | null> {
    const caja = await this.sesionesRepository.findOne({ where: { id: cajaId, activo: true } });
    if (!caja || caja.fechaCierre) {
      return null;
    }

    const ventasCompletadas = await this.ventasRepository.find({
      where: {
        cajaId,
        estado: EstadoVenta.COMPLETADA,
      },
    });

    caja.totalVentas = ventasCompletadas.reduce((acc, venta) => acc + Number(venta.total), 0);

    return this.sesionesRepository.save(caja);
  }
}
