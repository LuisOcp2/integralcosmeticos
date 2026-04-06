import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta } from '@cosmeticos/shared-types';
import { Repository } from 'typeorm';
import { SesionCaja } from './entities/sesion-caja.entity';
import { Caja } from './entities/caja.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';

export type SesionCajaResumen = {
  id: string;
  sedeId: string;
  cajeroId: string;
  usuarioId: string;
  estado: EstadoCaja;
  montoApertura: number;
  montoInicial: number;
  fechaApertura: Date;
  fechaCierre?: Date | null;
  montoCierre?: number | null;
  montoFinal?: number | null;
  montoSistema?: number | null;
  totalVentas?: number | null;
  totalEfectivo?: number | null;
  diferencia?: number | null;
  notasCierre?: string | null;
  cerradaPorId?: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(SesionCaja)
    private readonly sesionesRepository: Repository<SesionCaja>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
    @InjectRepository(Caja)
    private readonly cajasRepository: Repository<Caja>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
  ) {}

  private async getCajaPrincipalBySede(sedeId: string): Promise<Caja> {
    const caja = await this.cajasRepository.findOne({ where: { sedeId, activo: true } });
    if (!caja) {
      throw new NotFoundException('No existe una caja activa para la sede enviada');
    }
    return caja;
  }

  private async validarSedeActiva(sedeId: string): Promise<void> {
    const sede = await this.sedesRepository.findOne({ where: { id: sedeId, activo: true } });
    if (!sede) {
      throw new NotFoundException('Sede no encontrada o inactiva');
    }
  }

  private mapearSesionResumen(sesion: SesionCaja): SesionCajaResumen {
    return {
      id: sesion.id,
      sedeId: sesion.caja?.sedeId ?? '',
      cajeroId: sesion.cajeroId,
      usuarioId: sesion.cajeroId,
      estado: sesion.estado,
      montoApertura: Number(sesion.montoApertura),
      montoInicial: Number(sesion.montoApertura),
      fechaApertura: sesion.fechaApertura,
      fechaCierre: sesion.fechaCierre ?? null,
      montoCierre: sesion.montoCierre == null ? null : Number(sesion.montoCierre),
      montoFinal: sesion.montoCierre == null ? null : Number(sesion.montoCierre),
      montoSistema: sesion.montoSistema == null ? null : Number(sesion.montoSistema),
      totalVentas:
        sesion.montoSistema == null
          ? null
          : Number(sesion.montoSistema) - Number(sesion.montoApertura),
      totalEfectivo:
        sesion.montoSistema == null
          ? null
          : Number(sesion.montoSistema) - Number(sesion.montoApertura),
      diferencia: sesion.diferencia == null ? null : Number(sesion.diferencia),
      notasCierre: sesion.notasCierre ?? null,
      cerradaPorId: sesion.cerradaPorId ?? null,
      activo: sesion.estado === EstadoCaja.ABIERTA,
      createdAt: sesion.createdAt,
      updatedAt: sesion.updatedAt,
    };
  }

  private async getCajaAbiertaSesion(sedeId: string): Promise<SesionCaja | null> {
    await this.validarSedeActiva(sedeId);
    const caja = await this.getCajaPrincipalBySede(sedeId);
    return this.sesionesRepository.findOne({
      where: { cajaId: caja.id, estado: EstadoCaja.ABIERTA },
      relations: ['caja'],
      order: { fechaApertura: 'DESC' },
    });
  }

  async abrirCaja(
    sedeId: string,
    cajeroId: string,
    montoApertura: number,
  ): Promise<SesionCajaResumen> {
    await this.validarSedeActiva(sedeId);

    const abierta = await this.getCajaAbiertaSesion(sedeId);
    if (abierta) {
      throw new BadRequestException('Ya existe una caja abierta en esta sede');
    }

    const caja = await this.getCajaPrincipalBySede(sedeId);

    const sesion = this.sesionesRepository.create({
      cajaId: caja.id,
      cajeroId,
      estado: EstadoCaja.ABIERTA,
      montoApertura,
      fechaApertura: new Date(),
    });

    const guardada = await this.sesionesRepository.save(sesion);
    return this.mapearSesionResumen(guardada);
  }

  async cerrarCaja(
    cajaId: string,
    usuarioId: string,
    montoCierre: number,
    notas?: string,
  ): Promise<SesionCajaResumen> {
    const caja = await this.sesionesRepository.findOne({
      where: { id: cajaId },
      relations: ['caja'],
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    if (caja.estado === EstadoCaja.CERRADA) {
      throw new BadRequestException('La caja ya se encuentra cerrada');
    }

    const totalVentasRaw = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('COALESCE(SUM(venta.total), 0)', 'total')
      .where('venta.cajaId = :cajaId', { cajaId: caja.id })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .getRawOne<{ total: string }>();

    const montoSistema = Number(caja.montoApertura) + Number(totalVentasRaw?.total ?? 0);
    const diferencia = Number(montoCierre) - montoSistema;

    caja.estado = EstadoCaja.CERRADA;
    caja.fechaCierre = new Date();
    caja.montoCierre = montoCierre;
    caja.montoSistema = montoSistema;
    caja.diferencia = diferencia;
    caja.notasCierre = notas ?? null;
    caja.cerradaPorId = usuarioId;

    const cerrada = await this.sesionesRepository.save(caja);
    return this.mapearSesionResumen(cerrada);
  }

  async cerrarCajaActivaPorSede(
    sedeId: string,
    usuarioId: string,
    montoCierre: number,
    notas?: string,
  ): Promise<SesionCajaResumen> {
    const cajaActiva = await this.getCajaAbiertaSesion(sedeId);
    if (!cajaActiva) {
      throw new NotFoundException('No hay caja abierta para la sede enviada');
    }

    return this.cerrarCaja(cajaActiva.id, usuarioId, montoCierre, notas);
  }

  async getCajaAbierta(sedeId: string): Promise<SesionCajaResumen | null> {
    const sesion = await this.getCajaAbiertaSesion(sedeId);
    if (!sesion) {
      return null;
    }

    return this.mapearSesionResumen(sesion);
  }

  async getHistorial(sedeId: string): Promise<SesionCajaResumen[]> {
    await this.validarSedeActiva(sedeId);

    const sesiones = await this.sesionesRepository.find({
      where: { caja: { sedeId } },
      relations: ['caja'],
      order: { createdAt: 'DESC' },
    });

    return sesiones.map((sesion) => this.mapearSesionResumen(sesion));
  }
}
