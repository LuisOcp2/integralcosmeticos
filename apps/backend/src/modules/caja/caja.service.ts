import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoCaja, EstadoVenta, MetodoPago } from '@cosmeticos/shared-types';
import { Repository } from 'typeorm';
import { CierreCaja } from './entities/cierre-caja.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { Venta } from '../ventas/entities/venta.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CierreCaja)
    private readonly cajaRepository: Repository<CierreCaja>,
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

  async abrirCaja(sedeId: string, usuarioId: string, montoInicial: number): Promise<CierreCaja> {
    await this.validarSedeActiva(sedeId);

    const abierta = await this.getCajaAbierta(sedeId);
    if (abierta) {
      throw new BadRequestException('Ya existe una caja abierta en esta sede');
    }

    const caja = this.cajaRepository.create({
      sedeId,
      usuarioId,
      fechaApertura: new Date(),
      montoInicial,
      estado: EstadoCaja.ABIERTA,
      totalVentas: 0,
      totalEfectivo: 0,
      activo: true,
    });

    return this.cajaRepository.save(caja);
  }

  async cerrarCaja(cajaId: string, usuarioId: string, montoFinal: number): Promise<CierreCaja> {
    const caja = await this.cajaRepository.findOne({
      where: { id: cajaId, activo: true },
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    if (caja.estado !== EstadoCaja.ABIERTA) {
      throw new BadRequestException('La caja ya se encuentra cerrada');
    }

    const abiertasSede = await this.getCajaAbierta(caja.sedeId);
    if (!abiertasSede || abiertasSede.id !== caja.id) {
      throw new BadRequestException('La caja ya no esta activa para cierre');
    }

    const ventasCompletadas = await this.ventasRepository.find({
      where: {
        cajaId: caja.id,
        sedeId: caja.sedeId,
        estado: EstadoVenta.COMPLETADA,
        activo: true,
      },
    });

    const totalVentas = ventasCompletadas.reduce((acc, venta) => acc + Number(venta.total), 0);
    const totalEfectivo = ventasCompletadas
      .filter((venta) => venta.metodoPago === MetodoPago.EFECTIVO)
      .reduce((acc, venta) => acc + Number(venta.total), 0);
    const esperado = Number(caja.montoInicial) + totalEfectivo;
    const diferencia = montoFinal - esperado;

    caja.usuarioId = usuarioId;
    caja.fechaCierre = new Date();
    caja.montoFinal = montoFinal;
    caja.totalVentas = totalVentas;
    caja.totalEfectivo = totalEfectivo;
    caja.diferencia = diferencia;
    caja.estado = EstadoCaja.CERRADA;

    return this.cajaRepository.save(caja);
  }

  async cerrarCajaActivaPorSede(
    sedeId: string,
    usuarioId: string,
    montoFinal: number,
  ): Promise<CierreCaja> {
    const cajaActiva = await this.getCajaAbierta(sedeId);
    if (!cajaActiva) {
      throw new NotFoundException('No hay caja abierta para la sede enviada');
    }

    return this.cerrarCaja(cajaActiva.id, usuarioId, montoFinal);
  }

  async getCajaAbierta(sedeId: string): Promise<CierreCaja | null> {
    await this.validarSedeActiva(sedeId);

    return this.cajaRepository.findOne({
      where: {
        sedeId,
        estado: EstadoCaja.ABIERTA,
        activo: true,
      },
      order: { fechaApertura: 'DESC' },
    });
  }

  async getHistorial(sedeId: string): Promise<CierreCaja[]> {
    await this.validarSedeActiva(sedeId);

    return this.cajaRepository.find({
      where: { sedeId, activo: true },
      order: { createdAt: 'DESC' },
    });
  }

  async actualizarTotalesCaja(cajaId: string): Promise<CierreCaja | null> {
    const caja = await this.cajaRepository.findOne({ where: { id: cajaId, activo: true } });
    if (!caja || caja.estado !== EstadoCaja.ABIERTA) {
      return null;
    }

    const ventasCompletadas = await this.ventasRepository.find({
      where: {
        cajaId,
        estado: EstadoVenta.COMPLETADA,
        activo: true,
      },
    });

    caja.totalVentas = ventasCompletadas.reduce((acc, venta) => acc + Number(venta.total), 0);
    caja.totalEfectivo = ventasCompletadas
      .filter((venta) => venta.metodoPago === MetodoPago.EFECTIVO)
      .reduce((acc, venta) => acc + Number(venta.total), 0);

    return this.cajaRepository.save(caja);
  }
}
