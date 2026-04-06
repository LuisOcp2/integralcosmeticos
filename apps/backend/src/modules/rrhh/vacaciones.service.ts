import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Vacaciones, EstadoVacaciones } from './entities/vacaciones.entity';
import { Empleado } from './entities/empleado.entity';
import { FiltrosVacacionesDto } from './dto/filtros-vacaciones.dto';

function toDateYmd(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function calcularDiasHabiles(fechaInicio: string, fechaFin: string): number {
  const inicio = toDateYmd(fechaInicio);
  const fin = toDateYmd(fechaFin);
  if (inicio > fin) {
    throw new BadRequestException('fechaInicio no puede ser mayor a fechaFin');
  }

  let total = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const day = cursor.getUTCDay();
    if (day !== 0) {
      total += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return total;
}

@Injectable()
export class VacacionesService {
  constructor(
    @InjectRepository(Vacaciones)
    private readonly vacacionesRepository: Repository<Vacaciones>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
  ) {}

  async solicitar(empleadoId: string, fechaInicio: string, fechaFin: string) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const diasHabiles = calcularDiasHabiles(fechaInicio, fechaFin);
    const solicitud = this.vacacionesRepository.create({
      empleadoId,
      fechaInicio,
      fechaFin,
      diasHabiles,
      estado: EstadoVacaciones.SOLICITADA,
    });
    return this.vacacionesRepository.save(solicitud);
  }

  async aprobar(id: string, aprobadaPorId: string) {
    const vacaciones = await this.vacacionesRepository.findOne({ where: { id } });
    if (!vacaciones) {
      throw new NotFoundException('Solicitud de vacaciones no encontrada');
    }

    vacaciones.estado = EstadoVacaciones.APROBADA;
    vacaciones.aprobadaPorId = aprobadaPorId;
    vacaciones.motivoRechazo = null;
    return this.vacacionesRepository.save(vacaciones);
  }

  async rechazar(id: string, motivo: string) {
    const vacaciones = await this.vacacionesRepository.findOne({ where: { id } });
    if (!vacaciones) {
      throw new NotFoundException('Solicitud de vacaciones no encontrada');
    }

    vacaciones.estado = EstadoVacaciones.RECHAZADA;
    vacaciones.motivoRechazo = motivo.trim();
    return this.vacacionesRepository.save(vacaciones);
  }

  async listar(filtros: FiltrosVacacionesDto) {
    const where: any = {};
    if (filtros.empleadoId) where.empleadoId = filtros.empleadoId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.mes && filtros.ano) {
      const inicio = `${filtros.ano}-${String(filtros.mes).padStart(2, '0')}-01`;
      const finDate = new Date(Date.UTC(filtros.ano, filtros.mes, 0));
      const fin = finDate.toISOString().slice(0, 10);
      where.fechaInicio = Between(inicio, fin);
    }

    return this.vacacionesRepository.find({
      where,
      relations: { empleado: true },
      order: { fechaInicio: 'DESC' },
    });
  }
}
