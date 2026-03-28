import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoVenta, MetodoPago } from '@cosmeticos/shared-types';
import { Repository } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';

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

  async abrirCaja(sedeId: string, usuarioId: string, montoInicial: number): Promise<SesionCaja> {
    await this.validarSedeActiva(sedeId);

    const cajaFisica = await this.obtenerOCrearCajaPorSede(sedeId);
    const abierta = await this.getCajaAbierta(sedeId);
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

    return this.sesionesRepository.save(caja);
  }

  async cerrarCaja(cajaId: string, usuarioId: string, montoFinal: number): Promise<SesionCaja> {
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

    const abiertasSede = await this.getCajaAbierta(cajaFisica.sedeId);
    if (!abiertasSede || abiertasSede.id !== caja.id) {
      throw new BadRequestException('La caja ya no esta activa para cierre');
    }

    const ventasCompletadas = await this.ventasRepository.find({
      where: {
        cajaId: caja.id,
        sedeId: cajaFisica.sedeId,
        estado: EstadoVenta.COMPLETADA,
      },
    });

    const totalVentas = ventasCompletadas.reduce((acc, venta) => acc + Number(venta.total), 0);
    const totalEfectivo = ventasCompletadas
      .filter((venta) => venta.metodoPago === MetodoPago.EFECTIVO)
      .reduce((acc, venta) => acc + Number(venta.total), 0);
    const esperado = Number(caja.montoInicial) + totalEfectivo;
    const diferencia = montoFinal - esperado;

    caja.usuarioCierreId = usuarioId;
    caja.fechaCierre = new Date();
    caja.montoFinal = montoFinal;
    caja.totalVentas = totalVentas;
    caja.diferencia = diferencia;
    caja.activo = false;

    return this.sesionesRepository.save(caja);
  }

  async cerrarCajaActivaPorSede(
    sedeId: string,
    usuarioId: string,
    montoFinal: number,
  ): Promise<SesionCaja> {
    const cajaActiva = await this.getCajaAbierta(sedeId);
    if (!cajaActiva) {
      throw new NotFoundException('No hay caja abierta para la sede enviada');
    }

    return this.cerrarCaja(cajaActiva.id, usuarioId, montoFinal);
  }

  async getCajaAbierta(sedeId: string): Promise<SesionCaja | null> {
    await this.validarSedeActiva(sedeId);

    return this.sesionesRepository
      .createQueryBuilder('sesion')
      .innerJoin(Caja, 'caja', 'caja.id = sesion.cajaId')
      .where('caja.sedeId = :sedeId', { sedeId })
      .andWhere('caja.activa = true')
      .andWhere('sesion.activa = true')
      .orderBy('sesion.fechaApertura', 'DESC')
      .getOne();
  }

  async getHistorial(sedeId: string): Promise<SesionCaja[]> {
    await this.validarSedeActiva(sedeId);

    return this.sesionesRepository
      .createQueryBuilder('sesion')
      .innerJoin(Caja, 'caja', 'caja.id = sesion.cajaId')
      .where('caja.sedeId = :sedeId', { sedeId })
      .orderBy('sesion.createdAt', 'DESC')
      .getMany();
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
