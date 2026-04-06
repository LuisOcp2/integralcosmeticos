import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turno } from './entities/turno.entity';
import { AsignacionTurno } from './entities/asignacion-turno.entity';
import { CrearTurnoDto } from './dto/crear-turno.dto';
import { ActualizarTurnoDto } from './dto/actualizar-turno.dto';
import { FiltrosTurnoDto } from './dto/filtros-turno.dto';
import { CrearAsignacionTurnoDto } from './dto/crear-asignacion-turno.dto';
import { ActualizarAsignacionTurnoDto } from './dto/actualizar-asignacion-turno.dto';
import { FiltrosAsignacionTurnoDto } from './dto/filtros-asignacion-turno.dto';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private readonly turnoRepository: Repository<Turno>,
    @InjectRepository(AsignacionTurno)
    private readonly asignacionRepository: Repository<AsignacionTurno>,
  ) {}

  async crearTurno(dto: CrearTurnoDto): Promise<Turno> {
    const turno = this.turnoRepository.create({
      ...dto,
      nombre: dto.nombre.trim(),
      diasSemana: [...new Set(dto.diasSemana)].sort((a, b) => a - b),
      activo: dto.activo ?? true,
    });
    return this.turnoRepository.save(turno);
  }

  async listarTurnos(filtros: FiltrosTurnoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const qb = this.turnoRepository.createQueryBuilder('turno').orderBy('turno.nombre', 'ASC');

    if (typeof filtros.activo === 'boolean') {
      qb.andWhere('turno.activo = :activo', { activo: filtros.activo });
    }
    if (filtros.q?.trim()) {
      qb.andWhere('LOWER(turno.nombre) LIKE :q', { q: `%${filtros.q.trim().toLowerCase()}%` });
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerTurno(id: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({ where: { id } });
    if (!turno) {
      throw new NotFoundException('Turno no encontrado');
    }
    return turno;
  }

  async actualizarTurno(id: string, dto: ActualizarTurnoDto): Promise<Turno> {
    const turno = await this.obtenerTurno(id);
    Object.assign(turno, {
      ...dto,
      nombre: dto.nombre?.trim() ?? turno.nombre,
      diasSemana: dto.diasSemana
        ? [...new Set(dto.diasSemana)].sort((a, b) => a - b)
        : turno.diasSemana,
    });
    return this.turnoRepository.save(turno);
  }

  async eliminarTurno(id: string): Promise<void> {
    const turno = await this.obtenerTurno(id);
    turno.activo = false;
    await this.turnoRepository.save(turno);
  }

  async crearAsignacion(dto: CrearAsignacionTurnoDto): Promise<AsignacionTurno> {
    const asignacion = this.asignacionRepository.create({
      ...dto,
      fechaHasta: dto.fechaHasta ?? null,
    });
    return this.asignacionRepository.save(asignacion);
  }

  async listarAsignaciones(filtros: FiltrosAsignacionTurnoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const qb = this.asignacionRepository
      .createQueryBuilder('asignacion')
      .leftJoinAndSelect('asignacion.empleado', 'empleado')
      .leftJoinAndSelect('asignacion.turno', 'turno')
      .leftJoinAndSelect('asignacion.sede', 'sede')
      .orderBy('asignacion.fechaDesde', 'DESC');

    if (filtros.empleadoId) {
      qb.andWhere('asignacion.empleadoId = :empleadoId', { empleadoId: filtros.empleadoId });
    }
    if (filtros.sedeId) {
      qb.andWhere('asignacion.sedeId = :sedeId', { sedeId: filtros.sedeId });
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerAsignacion(id: string): Promise<AsignacionTurno> {
    const asignacion = await this.asignacionRepository.findOne({
      where: { id },
      relations: { empleado: true, turno: true, sede: true },
    });
    if (!asignacion) {
      throw new NotFoundException('Asignacion de turno no encontrada');
    }
    return asignacion;
  }

  async actualizarAsignacion(
    id: string,
    dto: ActualizarAsignacionTurnoDto,
  ): Promise<AsignacionTurno> {
    const asignacion = await this.obtenerAsignacion(id);
    Object.assign(asignacion, {
      ...dto,
      fechaHasta: dto.fechaHasta !== undefined ? (dto.fechaHasta ?? null) : asignacion.fechaHasta,
    });
    return this.asignacionRepository.save(asignacion);
  }

  async eliminarAsignacion(id: string): Promise<void> {
    const asignacion = await this.obtenerAsignacion(id);
    await this.asignacionRepository.remove(asignacion);
  }
}
